import {
  requireAuth,
  type RequestContext,
} from '../../_shared/context.ts';
import { toTrendVideo, type TrendSignalRow } from '../../_shared/game.ts';
import { ApiError, json, noContent, readJson } from '../../_shared/http.ts';
import { exportPrivateYouTubePlaylist } from '../../_shared/youtube-playlists.ts';
import { filterFavoriteTopSignals } from './favorite-top-signals.ts';
import {
  findUnavailableMusicVideoIds,
  normalizeMusicPlaylistExportInput,
} from './music-playlist-export.ts';

const ALL_CATEGORY_IDS = ['0', 'all'];
const FAVORITE_VIDEO_PAGE_SIZE = 50;

async function findTopTrendSignals(context: RequestContext, regionCode: string) {
  for (const categoryId of ALL_CATEGORY_IDS) {
    const { data, error } = await context.service
      .from('video_trend_signals')
      .select('*')
      .eq('region_code', regionCode)
      .eq('category_id', categoryId)
      .order('current_rank', { ascending: true })
      .limit(250);

    if (error) throw error;

    if (data && data.length > 0) {
      return data as TrendSignalRow[];
    }
  }

  return [];
}

function toFavorite(row: Record<string, unknown>) {
  return {
    channelId: row.channel_id,
    channelTitle: row.channel_title,
    createdAt: row.created_at,
    id: row.id,
    thumbnailUrl: row.thumbnail_url ?? null,
  };
}

function toPlayback(row: Record<string, unknown>) {
  return {
    channelTitle: row.channel_title ?? null,
    positionSeconds: row.position_seconds,
    thumbnailUrl: row.thumbnail_url ?? null,
    updatedAt: row.updated_at,
    videoId: row.video_id,
    videoTitle: row.video_title ?? null,
  };
}

export async function handlePersonalRoute(
  context: RequestContext,
  method: string,
  path: string,
) {
  if (path === '/api/me/favorite-streamers' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const { data, error } = await context.service
      .from('favorite_streamers')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return json((data ?? []).map((row) => toFavorite(row as Record<string, unknown>)));
  }

  if (path === '/api/me/favorite-streamers' && method === 'POST') {
    const { profile } = await requireAuth(context);
    const body = await readJson<{
      channelId?: string;
      channelTitle?: string;
      thumbnailUrl?: string | null;
    }>(context.request);
    const channelId = body.channelId?.trim();
    const channelTitle = body.channelTitle?.trim();

    if (!channelId || !channelTitle) {
      throw new ApiError(400, 'validation_error', '채널 ID와 채널명이 필요합니다.');
    }

    const { data, error } = await context.service
      .from('favorite_streamers')
      .upsert(
        {
          channel_id: channelId,
          channel_title: channelTitle,
          thumbnail_url: body.thumbnailUrl?.trim() || null,
          user_id: profile.id,
        },
        {
          onConflict: 'user_id,channel_id',
        },
      )
      .select('*')
      .single();

    if (error) throw error;
    return json(toFavorite(data as Record<string, unknown>), 201);
  }

  const favoriteDeleteMatch = path.match(/^\/api\/me\/favorite-streamers\/([^/]+)$/);
  if (favoriteDeleteMatch && method === 'DELETE') {
    const { profile } = await requireAuth(context);
    const { error } = await context.service
      .from('favorite_streamers')
      .delete()
      .eq('user_id', profile.id)
      .eq('channel_id', decodeURIComponent(favoriteDeleteMatch[1]));

    if (error) throw error;
    return noContent();
  }

  if (path === '/api/me/favorite-streamers/videos' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const regionCode = context.url.searchParams.get('regionCode')?.trim().toUpperCase() || 'KR';
    const offset = Math.max(
      0,
      Number.parseInt(context.url.searchParams.get('pageToken') ?? '0', 10) || 0,
    );
    const { data: favorites, error } = await context.service
      .from('favorite_streamers')
      .select('channel_id')
      .eq('user_id', profile.id);

    if (error) throw error;

    const channelIds = new Set((favorites ?? []).map((favorite) => favorite.channel_id));
    if (channelIds.size === 0) {
      return json({
        availableCategories: [],
        categoryId: 'favorite-streamers',
        description: '동일한 TOP 200 트렌드 싱크에서 즐겨찾기한 채널의 영상만 모았습니다.',
        items: [],
        label: '즐겨찾기 채널',
        nextPageToken: null,
      });
    }

    const topSignals = await findTopTrendSignals(context, regionCode);
    const favoriteSignals = filterFavoriteTopSignals(topSignals, channelIds);
    const nextOffset = offset + FAVORITE_VIDEO_PAGE_SIZE;
    const items = favoriteSignals
      .slice(offset, nextOffset)
      .map(toTrendVideo);

    return json({
      availableCategories: [],
      categoryId: 'favorite-streamers',
      description: '동일한 TOP 200 트렌드 싱크에서 즐겨찾기한 채널의 영상만 모았습니다.',
      items,
      label: '즐겨찾기 채널',
      nextPageToken: nextOffset < favoriteSignals.length ? String(nextOffset) : null,
    });
  }

  if (path === '/api/me/youtube-playlists/music-top' && method === 'POST') {
    await requireAuth(context);
    const googleAccessToken = context.request.headers.get('X-Google-Access-Token')?.trim();

    if (!googleAccessToken) {
      throw new ApiError(401, 'youtube_authorization_required', 'YouTube 연결이 필요합니다.');
    }

    const input = normalizeMusicPlaylistExportInput(await readJson(context.request));
    const topSignals = await findTopTrendSignals(context, input.regionCode);
    const unavailableVideoIds = findUnavailableMusicVideoIds(topSignals, input.videoIds);

    if (unavailableVideoIds.length > 0) {
      throw new ApiError(
        400,
        'music_playlist_items_changed',
        '음악 차트가 갱신되었습니다. 최신 목록에서 다시 시도해 주세요.',
        { details: { unavailableVideoIds } },
      );
    }

    return json(
      await exportPrivateYouTubePlaylist({
        googleAccessToken,
        title: input.title,
        videoIds: input.videoIds,
      }),
      201,
    );
  }

  if (path === '/api/me/playback-progress' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const { data, error } = await context.service
      .from('playback_progress')
      .select('*')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? json(toPlayback(data as Record<string, unknown>)) : noContent();
  }

  if (path === '/api/me/playback-progress' && method === 'POST') {
    const { profile } = await requireAuth(context);
    const body = await readJson<{
      channelTitle?: string | null;
      positionSeconds?: number;
      thumbnailUrl?: string | null;
      videoId?: string;
      videoTitle?: string | null;
    }>(context.request);
    const videoId = body.videoId?.trim();

    if (!videoId) {
      throw new ApiError(400, 'validation_error', 'videoId 값은 필수입니다.');
    }

    const { data, error } = await context.service
      .from('playback_progress')
      .upsert(
        {
          channel_title: body.channelTitle?.trim() || null,
          position_seconds: Math.max(0, Math.floor(body.positionSeconds ?? 0)),
          thumbnail_url: body.thumbnailUrl?.trim() || null,
          updated_at: new Date().toISOString(),
          user_id: profile.id,
          video_id: videoId,
          video_title: body.videoTitle?.trim() || null,
        },
        {
          onConflict: 'user_id,video_id',
        },
      )
      .select('*')
      .single();

    if (error) throw error;
    return json(toPlayback(data as Record<string, unknown>));
  }

  return null;
}
