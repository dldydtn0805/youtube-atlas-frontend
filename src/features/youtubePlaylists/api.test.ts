import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createMockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('exportMusicPlaylist', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends the app token and short-lived Google token to the personal export endpoint', async () => {
    const { exportMusicPlaylist } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        addedCount: 2,
        failedItems: [],
        playlistId: 'playlist-1',
        playlistUrl: 'https://www.youtube.com/playlist?list=playlist-1',
        requestedCount: 2,
        title: '테스트 재생목록',
      }, 201),
    );

    vi.stubGlobal('fetch', fetchMock);

    await exportMusicPlaylist('app-access-token', {
      googleAccessToken: 'google-access-token',
      regionCode: 'KR',
      title: '테스트 재생목록',
      videoIds: ['video-1', 'video-2'],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/me/youtube-playlists/music-top',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer app-access-token',
          'Content-Type': 'application/json',
          'X-Google-Access-Token': 'google-access-token',
        },
        method: 'POST',
      }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string)).toEqual({
      regionCode: 'KR',
      title: '테스트 재생목록',
      videoIds: ['video-1', 'video-2'],
    });
  });
});
