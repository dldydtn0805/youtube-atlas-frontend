import { fetchApi } from '../../lib/api';
import type { YouTubeCategorySection } from '../youtube/types';
import type { CreateFavoriteStreamerInput, FavoriteStreamer } from './types';

function createAuthorizationHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function fetchFavoriteStreamers(accessToken: string) {
  return fetchApi<FavoriteStreamer[]>('/api/me/favorite-streamers', {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchFavoriteStreamerVideos(
  accessToken: string,
  regionCode: string,
  pageToken?: string,
) {
  const params = new URLSearchParams({
    regionCode,
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  return fetchApi<YouTubeCategorySection>(`/api/me/favorite-streamers/videos?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function addFavoriteStreamer(
  accessToken: string,
  input: CreateFavoriteStreamerInput,
) {
  return fetchApi<FavoriteStreamer>('/api/me/favorite-streamers', {
    method: 'POST',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export async function removeFavoriteStreamer(accessToken: string, channelId: string) {
  await fetchApi<void>(`/api/me/favorite-streamers/${encodeURIComponent(channelId)}`, {
    method: 'DELETE',
    headers: createAuthorizationHeader(accessToken),
  });
}
