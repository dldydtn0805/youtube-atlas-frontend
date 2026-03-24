import type { VideoCategory } from '../../constants/videoCategories';
import { fetchApi } from '../../lib/api';
import type { YouTubeCategorySection } from './types';

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

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const query = params.size > 0 ? `?${params.toString()}` : '';

  return fetchApi<YouTubeCategorySection>(
    `/api/catalog/regions/${encodeURIComponent(regionCode)}/categories/${encodeURIComponent(category.id)}/videos${query}`,
  );
}
