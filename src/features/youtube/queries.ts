import { useQuery } from '@tanstack/react-query';
import { fetchPopularVideos } from './api';

export function usePopularVideos(regionCode: string) {
  return useQuery({
    queryKey: ['popularVideos', regionCode],
    queryFn: () => fetchPopularVideos(regionCode),
    staleTime: 1000 * 30,
  });
}
