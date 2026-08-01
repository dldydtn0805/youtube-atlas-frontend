import { beforeEach, describe, expect, it } from 'vitest';
import { readPendingYouTubeRating, writePendingYouTubeRating } from './pendingRating';

describe('pending YouTube rating', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('restores a recent rating after the OAuth redirect', () => {
    writePendingYouTubeRating({
      rating: 'like',
      requestedAt: 1_000,
      videoId: 'video-1',
    });

    expect(readPendingYouTubeRating(2_000)).toEqual({
      rating: 'like',
      requestedAt: 1_000,
      videoId: 'video-1',
    });
  });

  it('clears an expired rating action', () => {
    writePendingYouTubeRating({
      rating: 'like',
      requestedAt: 1_000,
      videoId: 'video-1',
    });

    expect(readPendingYouTubeRating(1_000 + 11 * 60 * 1000)).toBeNull();
    expect(window.sessionStorage).toHaveLength(0);
  });
});
