import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { requireCronSecret } from '../_shared/cron.ts';

const YOUTUBE_DATA_API_BASE_URL = 'https://www.googleapis.com/youtube/v3/videos';
const MAX_RESULTS_PER_CATEGORY = 50;
const SHORTS_MAX_DURATION_SECONDS = 180;
const SHORTS_TITLE_PATTERN = /#shorts\b|\bshorts?\b|쇼츠/i;
const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
} as const;

interface SyncTrendingRequest {
  regionCode: string;
  categoryId: string;
  categoryLabel: string;
  sourceCategoryIds?: string[];
}

interface YouTubeVideoItem {
  id: string;
  contentDetails: {
    duration: string;
  };
  snippet: {
    categoryId?: string;
    channelId?: string;
    channelTitle: string;
    publishedAt?: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
      standard?: { url: string };
      maxres?: { url: string };
    };
    title: string;
  };
  statistics?: {
    viewCount?: string;
  };
}

interface YouTubeVideoListResponse {
  error?: {
    message?: string;
  };
  items: YouTubeVideoItem[];
  nextPageToken?: string;
}

interface SourceCategoryPageResult {
  items: YouTubeVideoItem[];
  unavailableReason?: 'unsupported';
}

interface TrendSnapshotInsert {
  category_id: string;
  channel_id: string | null;
  channel_title: string;
  duration: string | null;
  published_at: string | null;
  rank: number;
  region_code: string;
  run_id: number;
  thumbnail_url: string;
  title: string;
  video_id: string;
  video_category_id: string | null;
  video_category_label: string | null;
  view_count: number | null;
}

function toErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const message = 'message' in error && typeof error.message === 'string' ? error.message : 'Unknown error';
    const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
    const details = 'details' in error && typeof error.details === 'string' ? error.details : undefined;
    const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : undefined;

    return {
      code,
      details,
      hint,
      message,
      raw: error,
    };
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown error',
    raw: error,
  };
}

function parseIso8601DurationToSeconds(duration: string) {
  const match = duration.match(
    /^P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );

  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const [, hours = '0', minutes = '0', seconds = '0'] = match;

  return Number(hours) * 60 * 60 + Number(minutes) * 60 + Number(seconds);
}

function isShortFormVideo(item: YouTubeVideoItem) {
  const durationInSeconds = parseIso8601DurationToSeconds(item.contentDetails.duration);

  if (durationInSeconds <= SHORTS_MAX_DURATION_SECONDS) {
    return true;
  }

  return SHORTS_TITLE_PATTERN.test(item.snippet.title);
}

function dedupeVideos(items: YouTubeVideoItem[]) {
  const uniqueItems = new Map<string, YouTubeVideoItem>();

  for (const item of items) {
    if (!uniqueItems.has(item.id)) {
      uniqueItems.set(item.id, item);
    }
  }

  return [...uniqueItems.values()];
}

function getThumbnailUrl(item: YouTubeVideoItem) {
  return (
    item.snippet.thumbnails.maxres?.url ??
    item.snippet.thumbnails.standard?.url ??
    item.snippet.thumbnails.high?.url ??
    item.snippet.thumbnails.medium?.url ??
    item.snippet.thumbnails.default?.url ??
    ''
  );
}

function parseViewCount(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function isIgnorableCategoryFetchError(error: unknown) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : '';

  return (
    message.includes('The requested video chart is not supported or is not available.') ||
    message.includes('Requested entity was not found.')
  );
}

async function fetchMostPopularVideos(
  regionCode: string,
  youtubeApiKey: string,
  categoryId?: string,
  pageToken?: string,
) {
  const params = new URLSearchParams({
    chart: 'mostPopular',
    key: youtubeApiKey,
    maxResults: String(MAX_RESULTS_PER_CATEGORY),
    part: 'snippet,contentDetails,statistics',
    regionCode,
  });

  if (categoryId) {
    params.set('videoCategoryId', categoryId);
  }

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const response = await fetch(`${YOUTUBE_DATA_API_BASE_URL}?${params.toString()}`);
  const result = (await response.json()) as YouTubeVideoListResponse;

  if (!response.ok || result.error?.message) {
    throw new Error(result.error?.message ?? `YouTube request failed with status ${response.status}.`);
  }

  return {
    items: result.items.filter((item) => !isShortFormVideo(item)),
    nextPageToken: result.nextPageToken,
  };
}

async function fetchPopularVideosPageForSource(
  regionCode: string,
  youtubeApiKey: string,
  sourceCategoryId?: string,
): Promise<SourceCategoryPageResult> {
  try {
    return {
      items: (await fetchMostPopularVideos(regionCode, youtubeApiKey, sourceCategoryId)).items,
    };
  } catch (error) {
    if (!isIgnorableCategoryFetchError(error)) {
      throw error;
    }

    return {
      items: [],
      unavailableReason: 'unsupported',
    };
  }
}

async function fetchPopularVideoPages(
  regionCode: string,
  youtubeApiKey: string,
  sourceCategoryId?: string,
) {
  const collected: YouTubeVideoItem[] = [];
  let pageToken: string | undefined;

  for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) {
    const page = await fetchMostPopularVideos(
      regionCode,
      youtubeApiKey,
      sourceCategoryId,
      pageToken,
    );

    collected.push(...page.items);
    pageToken = page.nextPageToken;

    if (!pageToken) {
      break;
    }
  }

  return dedupeVideos(collected);
}

async function fetchMergedCategoryVideos(
  regionCode: string,
  youtubeApiKey: string,
  sourceCategoryIds: string[],
) {
  if (sourceCategoryIds.length === 0) {
    return fetchPopularVideoPages(regionCode, youtubeApiKey);
  }

  if (sourceCategoryIds.length === 1) {
    try {
      return await fetchPopularVideoPages(regionCode, youtubeApiKey, sourceCategoryIds[0]);
    } catch (error) {
      if (!isIgnorableCategoryFetchError(error)) {
        throw error;
      }

      throw new Error(
        `현재 ${regionCode}에서는 요청한 카테고리 인기 차트를 지원하지 않습니다.`,
      );
    }
  }

  const sourcePages = await Promise.all(
    sourceCategoryIds.map((sourceCategoryId) =>
      fetchPopularVideosPageForSource(regionCode, youtubeApiKey, sourceCategoryId),
    ),
  );

  const availableSourcePages = sourcePages.filter((sourcePage) => sourcePage.unavailableReason !== 'unsupported');

  if (availableSourcePages.length === 0) {
    throw new Error(`현재 ${regionCode}에서는 요청한 병합 카테고리 인기 차트를 지원하지 않습니다.`);
  }

  return dedupeVideos(availableSourcePages.flatMap((sourcePage) => sourcePage.items));
}

function createSnapshotRows(
  runId: number,
  regionCode: string,
  categoryId: string,
  categoryLabel: string,
  videos: YouTubeVideoItem[],
) {
  return videos.map<TrendSnapshotInsert>((item, index) => ({
    category_id: categoryId,
    channel_id: item.snippet.channelId ?? null,
    channel_title: item.snippet.channelTitle,
    duration: item.contentDetails.duration ?? null,
    published_at: item.snippet.publishedAt ?? null,
    rank: index + 1,
    region_code: regionCode,
    run_id: runId,
    thumbnail_url: getThumbnailUrl(item),
    title: item.snippet.title,
    video_id: item.id,
    video_category_id: item.snippet.categoryId ?? null,
    video_category_label: categoryLabel,
    view_count: parseViewCount(item.statistics?.viewCount),
  }));
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      headers: corsHeaders,
      status: 405,
    });
  }

  try {
    requireCronSecret(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized.';
    return new Response(JSON.stringify({ error: message }), {
      headers: corsHeaders,
      status: 401,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey || !youtubeApiKey) {
    return new Response(JSON.stringify({ error: 'Missing required function secrets.' }), {
      headers: corsHeaders,
      status: 500,
    });
  }

  const body = (await request.json()) as Partial<SyncTrendingRequest>;
  const regionCode = body.regionCode?.trim().toUpperCase();
  const categoryId = body.categoryId?.trim();
  const categoryLabel = body.categoryLabel?.trim();
  const sourceCategoryIds = [...new Set((body.sourceCategoryIds ?? []).map((value) => value.trim()).filter(Boolean))];

  console.log('sync-trending:start', {
    categoryId,
    regionCode,
    sourceCategoryIds,
  });

  if (!regionCode || !categoryId || !categoryLabel) {
    return new Response(JSON.stringify({ error: 'regionCode, categoryId, categoryLabel are required.' }), {
      headers: corsHeaders,
      status: 400,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    console.log('sync-trending:fetch-videos');
    const videos = await fetchMergedCategoryVideos(regionCode, youtubeApiKey, sourceCategoryIds);
    console.log('sync-trending:fetched-videos', { count: videos.length });
    const { data: run, error: runError } = await supabase
      .from('video_trend_runs')
      .insert({
        category_id: categoryId,
        category_label: categoryLabel,
        region_code: regionCode,
        source_category_ids: sourceCategoryIds,
      })
      .select('id, captured_at')
      .single();

    if (runError || !run) {
      throw runError ?? new Error('Unable to create trend run.');
    }

    console.log('sync-trending:created-run', { runId: run.id });

    const snapshotRows = createSnapshotRows(
      run.id,
      regionCode,
      categoryId,
      categoryLabel,
      videos,
    );
    const { error: snapshotError } = await supabase.from('video_trend_snapshots').insert(snapshotRows);

    if (snapshotError) {
      throw snapshotError;
    }

    console.log('sync-trending:inserted-snapshots', { count: snapshotRows.length });

    const { data: previousRun, error: previousRunError } = await supabase
      .from('video_trend_runs')
      .select('id')
      .eq('region_code', regionCode)
      .eq('category_id', categoryId)
      .lt('id', run.id)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousRunError) {
      throw previousRunError;
    }

    console.log('sync-trending:previous-run', {
      previousRunId: previousRun?.id ?? null,
    });

    const previousSnapshots = previousRun
      ? await supabase
          .from('video_trend_snapshots')
          .select('video_id, rank, view_count')
          .eq('run_id', previousRun.id)
      : { data: [], error: null };

    if (previousSnapshots.error) {
      throw previousSnapshots.error;
    }

    const previousSnapshotByVideoId = new Map(
      (previousSnapshots.data ?? []).map((item) => [item.video_id as string, item]),
    );

    // A new main-chart sync unlocks prior buys and resets both sides of market demand.
    const signalRows = snapshotRows.map((snapshot) => {
      const previousSnapshot = previousSnapshotByVideoId.get(snapshot.video_id);
      const previousRank =
        previousSnapshot && typeof previousSnapshot.rank === 'number' ? previousSnapshot.rank : null;
      const previousViewCount =
        previousSnapshot && typeof previousSnapshot.view_count === 'number'
          ? previousSnapshot.view_count
          : null;

      return {
        captured_at: run.captured_at,
        category_id: categoryId,
        category_label: categoryLabel,
        channel_id: snapshot.channel_id,
        channel_title: snapshot.channel_title,
        current_rank: snapshot.rank,
        current_run_id: run.id,
        current_view_count: snapshot.view_count,
        is_new: previousRank === null,
        duration: snapshot.duration,
        previous_rank: previousRank,
        previous_run_id: previousRun?.id ?? null,
        previous_view_count: previousViewCount,
        rank_change: previousRank === null ? null : previousRank - snapshot.rank,
        region_code: regionCode,
        sync_buy_count: 0,
        sync_buy_quantity: 0,
        sync_sell_count: 0,
        sync_sell_quantity: 0,
        thumbnail_url: snapshot.thumbnail_url,
        title: snapshot.title,
        updated_at: new Date().toISOString(),
        video_id: snapshot.video_id,
        video_category_id: snapshot.video_category_id,
        video_category_label: snapshot.video_category_label,
        view_count_delta:
          previousViewCount === null || snapshot.view_count === null
            ? null
            : snapshot.view_count - previousViewCount,
      };
    });

    const { error: signalError } = await supabase
      .from('video_trend_signals')
      .upsert(signalRows, { onConflict: 'region_code,category_id,video_id' });

    if (signalError) {
      throw signalError;
    }

    console.log('sync-trending:upserted-signals', { count: signalRows.length });

    const { data: existingSignals, error: existingSignalsError } = await supabase
      .from('video_trend_signals')
      .select('video_id')
      .eq('region_code', regionCode)
      .eq('category_id', categoryId);

    if (existingSignalsError) {
      throw existingSignalsError;
    }

    const currentVideoIds = new Set(snapshotRows.map((item) => item.video_id));
    const staleVideoIds = (existingSignals ?? [])
      .map((item) => item.video_id as string)
      .filter((videoId) => !currentVideoIds.has(videoId));

    if (staleVideoIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('video_trend_signals')
        .delete()
        .eq('region_code', regionCode)
        .eq('category_id', categoryId)
        .in('video_id', staleVideoIds);

      if (deleteError) {
        throw deleteError;
      }
    }

    const completedAt = new Date().toISOString();
    const { error: completionError } = await supabase
      .from('video_trend_runs')
      .update({ completed_at: completedAt })
      .eq('id', run.id);

    if (completionError) {
      throw completionError;
    }

    console.log('sync-trending:completed-run', {
      completedAt,
      runId: run.id,
    });

    return new Response(
      JSON.stringify({
        capturedAt: run.captured_at,
        categoryId,
        demandCounterVersion: 2,
        regionCode,
        signalCount: signalRows.length,
        syncedVideos: snapshotRows.length,
      }),
      {
        headers: corsHeaders,
      },
    );
  } catch (error) {
    const errorPayload = toErrorPayload(error);

    console.error('sync-trending:error', {
      error: errorPayload,
    });

    return new Response(JSON.stringify({ error: errorPayload }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});
