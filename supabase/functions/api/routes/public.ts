import type { RequestContext } from '../../_shared/context.ts';
import {
  toTrendSignal,
  toTrendVideo,
  type TrendSignalRow,
} from '../../_shared/game.ts';
import {
  ApiError,
  json,
  requiredSearchParam,
} from '../../_shared/http.ts';
import {
  fetchCategories,
  fetchPopularVideos,
  fetchVideosByIds,
  toVideoResponse,
} from '../../_shared/youtube.ts';

const ALL_CATEGORY_IDS = ['all', '0'];
const MUSIC_CATEGORY_IDS = ['music', '10'];

function categoryDescription(categoryId: string, label: string) {
  if (ALL_CATEGORY_IDS.includes(categoryId)) {
    return '카테고리 구분 없이 현재 국가 전체 인기 영상을 보여줍니다.';
  }

  if (MUSIC_CATEGORY_IDS.includes(categoryId)) {
    return '뮤직비디오, 라이브, 음원 관련 인기 영상을 확인할 수 있습니다.';
  }

  return `${label} 카테고리 인기 영상을 확인할 수 있습니다.`;
}

async function findSignals(
  context: RequestContext,
  regionCode: string,
  categoryIds: string[],
  options: {
    ascending?: boolean;
    column?: string;
    limit?: number;
  } = {},
) {
  let query = context.service
    .from('video_trend_signals')
    .select('*')
    .eq('region_code', regionCode.toUpperCase())
    .in('category_id', categoryIds)
    .limit(options.limit ?? 200);

  if (options.column) {
    query = query.order(options.column, {
      ascending: options.ascending ?? false,
      nullsFirst: false,
    });
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as TrendSignalRow[];
}

async function findFirstAvailableSignals(
  context: RequestContext,
  regionCode: string,
  preferredCategoryIds: string[],
) {
  for (const categoryId of preferredCategoryIds) {
    const signals = await findSignals(context, regionCode, [categoryId], {
      ascending: true,
      column: 'current_rank',
      limit: 250,
    });

    if (signals.length > 0) {
      return {
        categoryId,
        signals,
      };
    }
  }

  return {
    categoryId: preferredCategoryIds[0],
    signals: [] as TrendSignalRow[],
  };
}

function toFeed(
  regionCode: string,
  categoryId: string,
  signals: TrendSignalRow[],
  extra: Record<string, unknown> = {},
) {
  return {
    capturedAt: signals[0]?.captured_at ?? null,
    categoryId,
    categoryLabel: signals[0]?.category_label ?? (ALL_CATEGORY_IDS.includes(categoryId) ? '전체' : '음악'),
    items: signals.map(toTrendSignal),
    regionCode,
    totalCount: signals.length,
    ...extra,
  };
}

async function listTopVideos(
  context: RequestContext,
  regionCode: string,
  categoryIds: string[],
) {
  const offset = Math.max(
    0,
    Number.parseInt(context.url.searchParams.get('pageToken') ?? '0', 10) || 0,
  );
  const { categoryId, signals } = await findFirstAvailableSignals(
    context,
    regionCode,
    categoryIds,
  );
  const pageSize = 50;
  const items = signals.slice(offset, offset + pageSize).map(toTrendVideo);
  const nextOffset = offset + pageSize;
  const label = signals[0]?.category_label ?? (MUSIC_CATEGORY_IDS.includes(categoryId) ? '음악' : '전체');

  return json({
    availableCategories: [],
    categoryId,
    description: categoryDescription(categoryId, label),
    items,
    label,
    nextPageToken: nextOffset < signals.length ? String(nextOffset) : null,
  });
}

async function getVideoHistory(
  context: RequestContext,
  regionCode: string,
  videoId: string,
) {
  const { categoryId, signals } = await findFirstAvailableSignals(
    context,
    regionCode,
    ALL_CATEGORY_IDS,
  );
  const currentSignal = signals.find((signal) => signal.video_id === videoId) ?? null;
  const { data: runs, error: runsError } = await context.service
    .from('video_trend_runs')
    .select('id, captured_at, category_label')
    .eq('region_code', regionCode)
    .eq('category_id', categoryId)
    .order('captured_at', { ascending: false })
    .limit(72);

  if (runsError) throw runsError;

  const runIds = (runs ?? []).map((run) => run.id);
  const { data: snapshots, error: snapshotsError } =
    runIds.length === 0
      ? { data: [], error: null }
      : await context.service
          .from('video_trend_snapshots')
          .select('*')
          .eq('video_id', videoId)
          .in('run_id', runIds);

  if (snapshotsError) throw snapshotsError;

  const snapshotByRunId = new Map((snapshots ?? []).map((snapshot) => [snapshot.run_id, snapshot]));
  const points = [...(runs ?? [])]
    .reverse()
    .map((run) => {
      const snapshot = snapshotByRunId.get(run.id);

      return {
        capturedAt: run.captured_at,
        chartOut: !snapshot,
        rank: snapshot?.rank ?? null,
        runId: run.id,
        viewCount: snapshot?.view_count ?? null,
      };
    });
  const latestSnapshot = [...(snapshots ?? [])].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  )[0];

  if (!currentSignal && !latestSnapshot) {
    throw new ApiError(404, 'video_history_not_found', '해당 영상의 순위 기록이 없습니다.');
  }

  return json({
    categoryId,
    categoryLabel: currentSignal?.category_label ?? '전체',
    channelTitle: currentSignal?.channel_title ?? latestSnapshot?.channel_title ?? '',
    latestCapturedAt:
      currentSignal?.captured_at ??
      latestSnapshot?.created_at ??
      new Date().toISOString(),
    latestChartOut: !currentSignal,
    latestRank: currentSignal?.current_rank ?? latestSnapshot?.rank ?? null,
    points,
    regionCode,
    thumbnailUrl: currentSignal?.thumbnail_url ?? latestSnapshot?.thumbnail_url ?? '',
    title: currentSignal?.title ?? latestSnapshot?.title ?? '',
    videoId,
  });
}

export async function handlePublicRoute(
  context: RequestContext,
  method: string,
  path: string,
) {
  const categoriesMatch = path.match(/^\/api\/catalog\/regions\/([^/]+)\/categories$/);
  if (categoriesMatch && method === 'GET') {
    return json(await fetchCategories(decodeURIComponent(categoriesMatch[1])));
  }

  const categoryVideosMatch = path.match(
    /^\/api\/catalog\/regions\/([^/]+)\/categories\/([^/]+)\/videos$/,
  );
  if (categoryVideosMatch && method === 'GET') {
    const regionCode = decodeURIComponent(categoryVideosMatch[1]).toUpperCase();
    const categoryId = decodeURIComponent(categoryVideosMatch[2]);
    const page = await fetchPopularVideos({
      categoryId,
      pageToken: context.url.searchParams.get('pageToken'),
      regionCode,
    });
    const category = (await fetchCategories(regionCode)).find((item) => item.id === categoryId);
    const signals = await findSignals(context, regionCode, [categoryId], {
      limit: 250,
    });
    const signalsByVideoId = new Map(signals.map((signal) => [signal.video_id, signal]));

    return json({
      availableCategories: [],
      categoryId,
      description: category?.description ?? categoryDescription(categoryId, category?.label ?? categoryId),
      items: page.items.map((video) => {
        const signal = signalsByVideoId.get(video.id);
        return toVideoResponse(video, category?.label, signal ? toTrendSignal(signal) : null);
      }),
      label: category?.label ?? categoryId,
      nextPageToken: page.nextPageToken,
    });
  }

  const videoMatch = path.match(/^\/api\/catalog\/videos\/([^/]+)$/);
  if (videoMatch && method === 'GET') {
    const videoId = decodeURIComponent(videoMatch[1]);
    const videos = await fetchVideosByIds([videoId]);

    if (videos.length === 0) {
      throw new ApiError(404, 'video_not_found', '존재하지 않는 영상입니다.');
    }

    return json(toVideoResponse(videos[0]));
  }

  if (path === '/api/trending/signals' && method === 'GET') {
    const regionCode = requiredSearchParam(context.url, 'regionCode').toUpperCase();
    const categoryId = requiredSearchParam(context.url, 'categoryId');
    const videoIds = context.url.searchParams.getAll('videoIds').filter(Boolean);
    let signals = await findSignals(context, regionCode, [categoryId], {
      limit: Math.max(videoIds.length, 1),
    });

    if (videoIds.length > 0) {
      const wantedVideoIds = new Set(videoIds);
      signals = signals.filter((signal) => wantedVideoIds.has(signal.video_id));
    }

    return json(signals.map(toTrendSignal));
  }

  if (path === '/api/trending/realtime-surging' && method === 'GET') {
    const regionCode = requiredSearchParam(context.url, 'regionCode').toUpperCase();
    const { categoryId, signals } = await findFirstAvailableSignals(
      context,
      regionCode,
      ALL_CATEGORY_IDS,
    );
    const threshold = 5;
    const filtered = signals
      .filter((signal) => (signal.rank_change ?? 0) >= threshold)
      .sort((left, right) => (right.rank_change ?? 0) - (left.rank_change ?? 0));

    return json(toFeed(regionCode, categoryId, filtered, { rankChangeThreshold: threshold }));
  }

  if (path === '/api/trending/top-rank-risers' && method === 'GET') {
    const regionCode = requiredSearchParam(context.url, 'regionCode').toUpperCase();
    const { categoryId, signals } = await findFirstAvailableSignals(
      context,
      regionCode,
      ALL_CATEGORY_IDS,
    );
    const limit = 10;
    const filtered = signals
      .filter((signal) => (signal.rank_change ?? 0) > 0)
      .sort((left, right) => (right.rank_change ?? 0) - (left.rank_change ?? 0))
      .slice(0, limit);

    return json(toFeed(regionCode, categoryId, filtered, { limit }));
  }

  if (path === '/api/trending/new-entries' && method === 'GET') {
    const regionCode = requiredSearchParam(context.url, 'regionCode').toUpperCase();
    const { categoryId, signals } = await findFirstAvailableSignals(
      context,
      regionCode,
      ALL_CATEGORY_IDS,
    );

    return json(
      toFeed(
        regionCode,
        categoryId,
        signals.filter((signal) => signal.is_new),
      ),
    );
  }

  if (path === '/api/trending/top-videos' && method === 'GET') {
    return listTopVideos(
      context,
      requiredSearchParam(context.url, 'regionCode').toUpperCase(),
      ALL_CATEGORY_IDS,
    );
  }

  if (path === '/api/trending/music-top-videos' && method === 'GET') {
    return listTopVideos(
      context,
      requiredSearchParam(context.url, 'regionCode').toUpperCase(),
      MUSIC_CATEGORY_IDS,
    );
  }

  const historyMatch = path.match(/^\/api\/trending\/videos\/([^/]+)\/history$/);
  if (historyMatch && method === 'GET') {
    return getVideoHistory(
      context,
      requiredSearchParam(context.url, 'regionCode').toUpperCase(),
      decodeURIComponent(historyMatch[1]),
    );
  }

  return null;
}
