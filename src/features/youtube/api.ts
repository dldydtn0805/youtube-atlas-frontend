import { YouTubeVideoListResponse } from './types';

export async function fetchPopularVideos(regionCode: string): Promise<YouTubeVideoListResponse> {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_YOUTUBE_API_KEY is not configured.');
  }

  const params = new URLSearchParams({
    part: 'snippet,contentDetails,statistics',
    chart: 'mostPopular',
    regionCode,
    maxResults: '50',
    key: apiKey,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`YouTube API request failed with status ${response.status}.`);
  }

  const result = (await response.json()) as YouTubeVideoListResponse & {
    error?: { message?: string };
  };

  if (result.error?.message) {
    throw new Error(result.error.message);
  }

  return result;
}
