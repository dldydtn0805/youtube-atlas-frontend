import { videoCategories } from '../../constants/videoCategories';
import { YouTubeCategorySection, YouTubeVideoListResponse } from './types';

const MAX_RESULTS_PER_CATEGORY = 50;

async function fetchMostPopularVideos(
  regionCode: string,
  categoryId: string,
  pageToken?: string,
): Promise<YouTubeVideoListResponse> {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails,statistics',
    chart: 'mostPopular',
    regionCode,
    videoCategoryId: categoryId,
    maxResults: String(MAX_RESULTS_PER_CATEGORY),
    key: getApiKey(),
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

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

function getApiKey() {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_YOUTUBE_API_KEY is not configured.');
  }

  return apiKey;
}

export async function fetchPopularVideosByCategory(
  regionCode: string,
  categoryId: string,
  pageToken?: string,
): Promise<YouTubeCategorySection> {
  const category = videoCategories.find((item) => item.id === categoryId);

  if (!category) {
    throw new Error('지원하지 않는 카테고리입니다.');
  }

  const result = await fetchMostPopularVideos(regionCode, category.id, pageToken);

  return {
    categoryId: category.id,
    label: category.label,
    description: category.description,
    items: result.items,
    nextPageToken: result.nextPageToken,
  };
}
