import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addFavoriteStreamer,
  fetchFavoriteStreamerVideos,
  fetchFavoriteStreamers,
  removeFavoriteStreamer,
} from './api';
import type { YouTubeCategorySection } from '../youtube/types';
import type { FavoriteStreamer, ToggleFavoriteStreamerInput } from './types';

function favoriteStreamersQueryKey(accessToken: string | null) {
  return ['favoriteStreamers', accessToken] as const;
}

function favoriteStreamerVideosQueryKey(accessToken: string | null, regionCode: string) {
  return ['favoriteStreamerVideos', accessToken, regionCode] as const;
}

function upsertFavoriteStreamer(
  favoriteStreamers: FavoriteStreamer[] = [],
  favoriteStreamer: FavoriteStreamer,
) {
  const nextFavoriteStreamers = favoriteStreamers.filter(
    (item) => item.channelId !== favoriteStreamer.channelId,
  );

  return [favoriteStreamer, ...nextFavoriteStreamers];
}

export function useFavoriteStreamers(accessToken: string | null, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken),
    queryKey: favoriteStreamersQueryKey(accessToken),
    queryFn: () => fetchFavoriteStreamers(accessToken as string),
    staleTime: 1000 * 60,
  });
}

export function useFavoriteStreamerVideos(
  accessToken: string | null,
  regionCode: string,
  enabled = true,
) {
  return useInfiniteQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: favoriteStreamerVideosQueryKey(accessToken, regionCode),
    queryFn: ({ pageParam }) =>
      fetchFavoriteStreamerVideos(accessToken as string, regionCode, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: YouTubeCategorySection) => lastPage.nextPageToken,
    staleTime: 1000 * 30,
  });
}

export function useToggleFavoriteStreamer(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ToggleFavoriteStreamerInput) => {
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.');
      }

      if (input.isFavorited) {
        await removeFavoriteStreamer(accessToken, input.channelId);
        return null;
      }

      return addFavoriteStreamer(accessToken, input);
    },
    onMutate: async (input) => {
      const queryKey = favoriteStreamersQueryKey(accessToken);

      await queryClient.cancelQueries({ queryKey });

      const previousFavoriteStreamers = queryClient.getQueryData<FavoriteStreamer[]>(queryKey) ?? [];

      if (input.isFavorited) {
        queryClient.setQueryData<FavoriteStreamer[]>(
          queryKey,
          previousFavoriteStreamers.filter((item) => item.channelId !== input.channelId),
        );
      } else {
        queryClient.setQueryData<FavoriteStreamer[]>(
          queryKey,
          upsertFavoriteStreamer(previousFavoriteStreamers, {
            channelId: input.channelId,
            channelTitle: input.channelTitle,
            createdAt: new Date().toISOString(),
            id: 0,
            thumbnailUrl: input.thumbnailUrl,
          }),
        );
      }

      return { previousFavoriteStreamers, queryKey };
    },
    onError: (_error, _input, context) => {
      if (!context) {
        return;
      }

      queryClient.setQueryData(context.queryKey, context.previousFavoriteStreamers);
    },
    onSuccess: (favoriteStreamer, input, context) => {
      if (!context) {
        return;
      }

      if (input.isFavorited) {
        queryClient.setQueryData<FavoriteStreamer[]>(
          context.queryKey,
          (current = []) => current.filter((item) => item.channelId !== input.channelId),
        );
        return;
      }

      if (favoriteStreamer) {
        queryClient.setQueryData<FavoriteStreamer[]>(
          context.queryKey,
          (current = []) => upsertFavoriteStreamer(current, favoriteStreamer),
        );
      }
    },
    onSettled: async (_data, _error, _input, context) => {
      await queryClient.invalidateQueries({
        queryKey: context?.queryKey ?? favoriteStreamersQueryKey(accessToken),
      });
      await queryClient.invalidateQueries({
        queryKey: ['favoriteStreamerVideos', accessToken],
      });
    },
  });
}
