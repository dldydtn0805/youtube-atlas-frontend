import type { YouTubeVideoRating } from './types';

const PENDING_YOUTUBE_RATING_KEY = 'youtube-atlas-pending-youtube-rating';
const PENDING_YOUTUBE_RATING_TTL_MS = 10 * 60 * 1000;

export interface PendingYouTubeRating {
  rating: YouTubeVideoRating;
  requestedAt: number;
  videoId: string;
}

function isPendingYouTubeRating(value: unknown): value is PendingYouTubeRating {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    (candidate.rating === 'like' || candidate.rating === 'none') &&
    typeof candidate.requestedAt === 'number' &&
    typeof candidate.videoId === 'string' &&
    candidate.videoId.length > 0
  );
}

export function clearPendingYouTubeRating() {
  window.sessionStorage.removeItem(PENDING_YOUTUBE_RATING_KEY);
}

export function readPendingYouTubeRating(now = Date.now()) {
  const storedValue = window.sessionStorage.getItem(PENDING_YOUTUBE_RATING_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown;

    if (
      isPendingYouTubeRating(parsedValue) &&
      now - parsedValue.requestedAt <= PENDING_YOUTUBE_RATING_TTL_MS
    ) {
      return parsedValue;
    }
  } catch {
    // Clear malformed state below.
  }

  clearPendingYouTubeRating();
  return null;
}

export function writePendingYouTubeRating(value: PendingYouTubeRating) {
  window.sessionStorage.setItem(PENDING_YOUTUBE_RATING_KEY, JSON.stringify(value));
}
