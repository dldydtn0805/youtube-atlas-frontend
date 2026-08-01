import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './http.ts';
import { exportPrivateYouTubePlaylist } from './youtube-playlists.ts';

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

describe('exportPrivateYouTubePlaylist', () => {
  it('creates one private playlist and inserts videos in the requested order', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ id: 'playlist-1' }, 201))
      .mockResolvedValue(response({ id: 'playlist-item' }, 201));

    const result = await exportPrivateYouTubePlaylist(
      {
        googleAccessToken: 'google-token',
        title: '음악 TOP 2',
        videoIds: ['video-1', 'video-2'],
      },
      fetcher,
    );

    expect(result).toEqual({
      addedCount: 2,
      failedItems: [],
      playlistId: 'playlist-1',
      playlistUrl: 'https://www.youtube.com/playlist?list=playlist-1',
      requestedCount: 2,
      title: '음악 TOP 2',
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      status: { privacyStatus: 'private' },
    });
    expect(JSON.parse(fetcher.mock.calls[1][1].body).snippet.resourceId.videoId).toBe('video-1');
    expect(JSON.parse(fetcher.mock.calls[2][1].body).snippet.resourceId.videoId).toBe('video-2');
  });

  it('returns partial failures without discarding the created playlist', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ id: 'playlist-1' }, 201))
      .mockResolvedValueOnce(response({ id: 'playlist-item-1' }, 201))
      .mockResolvedValueOnce(response({ error: { message: 'Video not found' } }, 404));

    const result = await exportPrivateYouTubePlaylist(
      {
        googleAccessToken: 'google-token',
        title: '음악 TOP 2',
        videoIds: ['video-1', 'video-2'],
      },
      fetcher,
    );

    expect(result.addedCount).toBe(1);
    expect(result.failedItems).toEqual([{ message: 'Video not found', videoId: 'video-2' }]);
  });

  it('returns a reconnectable error when playlist authorization is rejected', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response({ error: { errors: [{ reason: 'insufficientPermissions' }] } }, 403),
    );

    await expect(
      exportPrivateYouTubePlaylist(
        {
          googleAccessToken: 'google-token',
          title: '음악 TOP 1',
          videoIds: ['video-1'],
        },
        fetcher,
      ),
    ).rejects.toMatchObject<ApiError>({ code: 'youtube_permission_required', status: 403 });
  });
});
