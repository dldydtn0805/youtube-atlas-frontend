import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createMockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('YouTube ratings API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends both the app token and short-lived Google token when setting a like', async () => {
    const { updateYouTubeVideoRating } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({ rating: 'like', videoId: 'video-1' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await updateYouTubeVideoRating(
      'app-access-token',
      'google-access-token',
      'video-1',
      'like',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/me/youtube-ratings/video-1',
      {
        body: JSON.stringify({ rating: 'like' }),
        headers: {
          Authorization: 'Bearer app-access-token',
          'Content-Type': 'application/json',
          'X-Google-Access-Token': 'google-access-token',
        },
        method: 'PUT',
      },
    );
  });
});
