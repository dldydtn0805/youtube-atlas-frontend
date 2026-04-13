import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { VideoCategory } from '../../constants/videoCategories';
import { fetchMusicTopVideos, fetchPopularVideosByCategory, fetchVideoById, fetchVideoCategories } from './api';

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

export function useVideoById(videoId: string | undefined, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(videoId),
    queryKey: ['videoById', videoId],
    queryFn: () => fetchVideoById(videoId as string),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMusicTopVideos(regionCode: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['musicTopVideos', regionCode],
    queryFn: ({ pageParam }) => fetchMusicTopVideos(regionCode, pageParam),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    staleTime: 1000 * 30,
  });
}
