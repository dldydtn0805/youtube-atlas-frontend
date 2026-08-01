import { fetchApi } from '../../lib/api';
import type { YouTubeVideoRating, YouTubeVideoRatingResult } from './types';

function getRatingPath(videoId: string) {
  return `/api/me/youtube-ratings/${encodeURIComponent(videoId)}`;
}

function getHeaders(accessToken: string, googleAccessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'X-Google-Access-Token': googleAccessToken,
  };
}

export function fetchYouTubeVideoRating(
  accessToken: string,
  googleAccessToken: string,
  videoId: string,
) {
  return fetchApi<YouTubeVideoRatingResult>(getRatingPath(videoId), {
    headers: getHeaders(accessToken, googleAccessToken),
  });
}

export function updateYouTubeVideoRating(
  accessToken: string,
  googleAccessToken: string,
  videoId: string,
  rating: YouTubeVideoRating,
) {
  return fetchApi<YouTubeVideoRatingResult>(getRatingPath(videoId), {
    body: JSON.stringify({ rating }),
    headers: {
      ...getHeaders(accessToken, googleAccessToken),
      'Content-Type': 'application/json',
    },
    method: 'PUT',
  });
}
