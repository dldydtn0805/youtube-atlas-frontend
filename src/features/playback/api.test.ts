import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createMockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null ? '' : JSON.stringify(body)),
  } as Response;
}

describe('playback progress api', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requests the current playback progress with the auth header', async () => {
    const { fetchPlaybackProgress } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(createMockResponse(null, 204));

    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchPlaybackProgress('access-token');

    expect(response).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/me/playback-progress',
      {
        headers: {
          Authorization: 'Bearer access-token',
        },
      },
    );
  });

  it('posts playback progress with normalized seconds', async () => {
    const { upsertPlaybackProgress } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        channelTitle: 'Streamer One',
        positionSeconds: 184,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        updatedAt: '2026-04-03T00:00:00.000Z',
        videoId: 'video-1',
        videoTitle: 'Video One',
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await upsertPlaybackProgress('access-token', {
      channelTitle: 'Streamer One',
      positionSeconds: 184.8,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      videoId: 'video-1',
      videoTitle: 'Video One',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/me/playback-progress',
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
      channelTitle: 'Streamer One',
      positionSeconds: 184,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      videoId: 'video-1',
      videoTitle: 'Video One',
    });
  });

  it('passes keepalive when requested for unload-safe saves', async () => {
    const { upsertPlaybackProgress } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        channelTitle: 'Streamer One',
        positionSeconds: 184,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        updatedAt: '2026-04-03T00:00:00.000Z',
        videoId: 'video-1',
        videoTitle: 'Video One',
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await upsertPlaybackProgress(
      'access-token',
      {
        channelTitle: 'Streamer One',
        positionSeconds: 184,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        videoId: 'video-1',
        videoTitle: 'Video One',
      },
      { keepalive: true },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/me/playback-progress',
      expect.objectContaining({
        keepalive: true,
      }),
    );
  });
});
