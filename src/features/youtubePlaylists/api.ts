import { fetchApi } from '../../lib/api';
import type { MusicPlaylistExportRequest, MusicPlaylistExportResult } from './types';

export function exportMusicPlaylist(
  accessToken: string,
  request: MusicPlaylistExportRequest,
) {
  return fetchApi<MusicPlaylistExportResult>('/api/me/youtube-playlists/music-top', {
    body: JSON.stringify({
      regionCode: request.regionCode,
      title: request.title,
      videoIds: request.videoIds,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Google-Access-Token': request.googleAccessToken,
    },
    method: 'POST',
  });
}
