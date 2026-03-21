import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchPopularVideosByCategory } from './api';

export function usePopularVideosByCategory(regionCode: string, categoryId: string) {
  return useInfiniteQuery({
    queryKey: ['popularVideosByCategory', regionCode, categoryId],
    queryFn: ({ pageParam }) => fetchPopularVideosByCategory(regionCode, categoryId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    staleTime: 1000 * 30,
  });
}
