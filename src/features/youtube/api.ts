import { supportsVideoTrendSignals, type VideoCategory } from '../../constants/videoCategories';
import { fetchApi } from '../../lib/api';
import type { YouTubeCategorySection, YouTubeVideoItem } from './types';

export async function fetchVideoCategories(regionCode: string): Promise<VideoCategory[]> {
  return fetchApi<VideoCategory[]>(
    `/api/catalog/regions/${encodeURIComponent(regionCode)}/categories`,
  );
}

export async function fetchPopularVideosByCategory(
  regionCode: string,
  category: VideoCategory,
  pageToken?: string,
): Promise<YouTubeCategorySection> {
  const params = new URLSearchParams();
  params.set('regionCode', regionCode);

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const query = params.size > 0 ? `?${params.toString()}` : '';
  const encodedRegionCode = encodeURIComponent(regionCode);
  const encodedCategoryId = encodeURIComponent(category.id);

  if (supportsVideoTrendSignals(category.id, regionCode)) {
    return fetchApi<YouTubeCategorySection>(`/api/trending/top-videos${query}`);
  }

  return fetchApi<YouTubeCategorySection>(
    `/api/catalog/regions/${encodedRegionCode}/categories/${encodedCategoryId}/videos${
      pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ''
    }`,
  );
}

export async function fetchVideoById(videoId: string): Promise<YouTubeVideoItem> {
  return fetchApi<YouTubeVideoItem>(`/api/catalog/videos/${encodeURIComponent(videoId)}`);
}
