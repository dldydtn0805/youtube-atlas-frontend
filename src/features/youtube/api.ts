import {
  ALL_VIDEO_CATEGORY,
  ALL_VIDEO_CATEGORY_ID,
  VideoCategory,
  toVideoCategory,
} from '../../constants/videoCategories';
import {
  YouTubeCategorySection,
  YouTubeVideoCategoryListResponse,
  YouTubeVideoListResponse,
} from './types';

const MAX_RESULTS_PER_CATEGORY = 50;
const CATEGORY_LANGUAGE = 'ko';
const EXCLUDED_CATEGORY_IDS = new Set(['42']);
const SHORTS_MAX_DURATION_SECONDS = 180;
const SHORTS_TITLE_PATTERN = /#shorts\b|\bshorts?\b|쇼츠/i;

function parseIso8601DurationToSeconds(duration: string) {
  const match = duration.match(
    /^P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );

  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const [, hours = '0', minutes = '0', seconds = '0'] = match;

  return Number(hours) * 60 * 60 + Number(minutes) * 60 + Number(seconds);
}

function isShortFormVideo(item: YouTubeVideoListResponse['items'][number]) {
  const durationInSeconds = parseIso8601DurationToSeconds(item.contentDetails.duration);

  if (durationInSeconds <= SHORTS_MAX_DURATION_SECONDS) {
    return true;
  }

  return SHORTS_TITLE_PATTERN.test(item.snippet.title);
}

async function fetchVideoCategoryList(regionCode: string): Promise<YouTubeVideoCategoryListResponse> {
  const params = new URLSearchParams({
    part: 'snippet',
    regionCode,
    hl: CATEGORY_LANGUAGE,
    key: getApiKey(),
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/videoCategories?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`YouTube API request failed with status ${response.status}.`);
  }

  const result = (await response.json()) as YouTubeVideoCategoryListResponse & {
    error?: { message?: string };
  };

  if (result.error?.message) {
    throw new Error(result.error.message);
  }

  return result;
}

async function fetchMostPopularVideos(
  regionCode: string,
  categoryId?: string,
  pageToken?: string,
): Promise<YouTubeVideoListResponse> {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails,statistics',
    chart: 'mostPopular',
    regionCode,
    maxResults: String(MAX_RESULTS_PER_CATEGORY),
    key: getApiKey(),
  });

  if (categoryId) {
    params.set('videoCategoryId', categoryId);
  }

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

export async function fetchVideoCategories(regionCode: string): Promise<VideoCategory[]> {
  const result = await fetchVideoCategoryList(regionCode);
  const categories = result.items
    .filter((item) => !EXCLUDED_CATEGORY_IDS.has(item.id))
    .map((item) => toVideoCategory(item))
    .filter((item): item is VideoCategory => item !== null)
    .sort((left, right) => left.label.localeCompare(right.label, 'ko'));

  if (categories.length === 0) {
    throw new Error('표시할 수 있는 카테고리가 없습니다.');
  }

  return [ALL_VIDEO_CATEGORY, ...categories];
}

export async function fetchPopularVideosByCategory(
  regionCode: string,
  category: VideoCategory,
  pageToken?: string,
): Promise<YouTubeCategorySection> {
  let nextToken = pageToken;
  let result: YouTubeVideoListResponse | undefined;
  let items: YouTubeVideoListResponse['items'] = [];

  do {
    result = await fetchMostPopularVideos(
      regionCode,
      category.id === ALL_VIDEO_CATEGORY_ID ? undefined : category.id,
      nextToken,
    );
    items = [...items, ...result.items.filter((item) => !isShortFormVideo(item))];
    nextToken = result.nextPageToken;
  } while (items.length === 0 && nextToken);

  return {
    categoryId: category.id,
    label: category.label,
    description: category.description,
    items,
    nextPageToken: nextToken,
  };
}
