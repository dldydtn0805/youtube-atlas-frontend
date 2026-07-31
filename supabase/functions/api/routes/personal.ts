import {
  requireAuth,
  type RequestContext,
} from '../../_shared/context.ts';
import { ApiError, json, noContent, readJson } from '../../_shared/http.ts';
import {
  fetchPopularVideos,
  toVideoResponse,
} from '../../_shared/youtube.ts';

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
    const pageToken = context.url.searchParams.get('pageToken');
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
        description: '전체 인기 영상 중 즐겨찾기한 채널의 영상만 모았습니다.',
        items: [],
        label: '즐겨찾기 채널',
        nextPageToken: null,
      });
    }

    const page = await fetchPopularVideos({
      pageToken,
      regionCode,
    });
    const items = page.items
      .filter((video) => channelIds.has(video.snippet?.channelId ?? ''))
      .map((video) => toVideoResponse(video));

    return json({
      availableCategories: [],
      categoryId: 'favorite-streamers',
      description: '전체 인기 영상 중 즐겨찾기한 채널의 영상만 모았습니다.',
      items,
      label: '즐겨찾기 채널',
      nextPageToken: page.nextPageToken,
    });
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
