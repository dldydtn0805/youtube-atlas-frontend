import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { VideoCategory } from '../../constants/videoCategories';
import { fetchPopularVideosByCategory, fetchVideoCategories } from './api';

export function useVideoCategories(regionCode: string) {
  return useQuery({
    queryKey: ['videoCategories', regionCode],
    queryFn: () => fetchVideoCategories(regionCode),
    staleTime: 1000 * 60 * 5,
  });
}

export function usePopularVideosByCategory(regionCode: string, category?: VideoCategory) {
  return useInfiniteQuery({
    queryKey: ['popularVideosByCategory', regionCode, category?.id],
    queryFn: ({ pageParam }) => {
      if (!category) {
        throw new Error('카테고리를 먼저 선택해 주세요.');
      }

      return fetchPopularVideosByCategory(regionCode, category, pageParam);
    },
    enabled: Boolean(category),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    staleTime: 1000 * 30,
  });
}
