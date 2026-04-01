import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createMockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('favorite streamer api', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requests the current favorite streamer list with the auth header', async () => {
    const { fetchFavoriteStreamers } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(createMockResponse([]));

    vi.stubGlobal('fetch', fetchMock);

    await fetchFavoriteStreamers('access-token');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/me/favorite-streamers',
      {
        headers: {
          Authorization: 'Bearer access-token',
        },
      },
    );
  });

  it('posts a favorite streamer with the expected payload', async () => {
    const { addFavoriteStreamer } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        id: 1,
        channelId: 'channel-1',
        channelTitle: 'Streamer One',
        thumbnailUrl: 'https://example.com/channel.jpg',
        createdAt: '2026-04-01T00:00:00.000Z',
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await addFavoriteStreamer('access-token', {
      channelId: 'channel-1',
      channelTitle: 'Streamer One',
      thumbnailUrl: 'https://example.com/channel.jpg',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/me/favorite-streamers',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        },
      }),
    );
    expect(
      JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string),
    ).toEqual({
      channelId: 'channel-1',
      channelTitle: 'Streamer One',
      thumbnailUrl: 'https://example.com/channel.jpg',
    });
  });

  it('deletes a favorite streamer by channel id', async () => {
    const { removeFavoriteStreamer } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(createMockResponse(null, 204));

    vi.stubGlobal('fetch', fetchMock);

    await removeFavoriteStreamer('access-token', 'UC/abc');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/me/favorite-streamers/UC%2Fabc',
      {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer access-token',
        },
      },
    );
  });

  it('requests favorite streamer videos with region and pagination params', async () => {
    const { fetchFavoriteStreamerVideos } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        categoryId: 'favorite-streamers',
        description: 'favorites',
        items: [],
        label: '즐겨찾기 채널',
        nextPageToken: 'next-page',
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await fetchFavoriteStreamerVideos('access-token', 'KR', 'next/page');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/me/favorite-streamers/videos?regionCode=KR&pageToken=next%2Fpage',
      {
        headers: {
          Authorization: 'Bearer access-token',
        },
      },
    );
  });
});
