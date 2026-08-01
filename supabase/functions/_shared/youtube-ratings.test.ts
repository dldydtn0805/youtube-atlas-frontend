import { describe, expect, it, vi } from 'vitest';
import { getYouTubeVideoRating, setYouTubeVideoRating } from './youtube-ratings.ts';

function response(body: unknown, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    headers: body === null ? undefined : { 'Content-Type': 'application/json' },
    status,
  });
}

describe('YouTube video ratings', () => {
  it('reads the current account rating for one video', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ items: [{ rating: 'like' }] }));

    await expect(getYouTubeVideoRating('google-token', 'video-1', fetcher)).resolves.toBe('like');
    expect(fetcher).toHaveBeenCalledWith(
      'https://www.googleapis.com/youtube/v3/videos/getRating?id=video-1',
      { headers: { Authorization: 'Bearer google-token' } },
    );
  });

  it('sets a like through the authenticated YouTube rating endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(null, 204));

    await setYouTubeVideoRating('google-token', 'video-1', 'like', fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      'https://www.googleapis.com/youtube/v3/videos/rate?id=video-1&rating=like',
      {
        headers: { Authorization: 'Bearer google-token' },
        method: 'POST',
      },
    );
  });

  it('turns missing YouTube scope into a contextual permission error', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({
      error: {
        errors: [{ reason: 'insufficientPermissions' }],
        message: 'Insufficient Permission',
      },
    }, 403));

    await expect(setYouTubeVideoRating('identity-token', 'video-1', 'like', fetcher)).rejects.toMatchObject({
      code: 'youtube_permission_required',
      status: 403,
    });
  });
});
