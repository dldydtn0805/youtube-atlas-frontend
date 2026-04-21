import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchBuyableMarketChart,
  buyGamePosition,
  deleteGameNotification,
  deleteGameNotifications,
  fetchSellGamePreview,
  fetchCurrentGameSeason,
  fetchGameCoinOverview,
  fetchGameCoinTierProgress,
  fetchGameHighlights,
  fetchGameLeaderboard,
  fetchGameLeaderboardHighlights,
  fetchGameLeaderboardPositionRankHistory,
  fetchGameLeaderboardPositions,
  fetchGameMarket,
  fetchGameNotifications,
  fetchGamePositionRankHistory,
  fetchMySeasonCoinResult,
  fetchMyGamePositions,
  markGameNotificationsRead,
  sellGamePosition,
  sellGamePositions,
} from './api';
import type {
  CreateGamePositionInput,
  GameCurrentSeason,
  GameNotification,
  SellGamePositionsInput,
} from './types';

export const gameQueryKeys = {
  buyableMarketChart: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'buyableMarketChart', accessToken, regionCode] as const,
  currentSeason: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'currentSeason', accessToken, regionCode] as const,
  coinOverview: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'coinOverview', accessToken, regionCode] as const,
  coinTierProgress: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'coinTierProgress', accessToken, regionCode] as const,
  leaderboard: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'leaderboard', accessToken, regionCode] as const,
  highlights: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'highlights', accessToken, regionCode] as const,
  notifications: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'notifications', accessToken, regionCode] as const,
  leaderboardPositions: (accessToken: string | null, userId: number | null, regionCode: string | null) =>
    ['game', 'leaderboardPositions', accessToken, userId, regionCode] as const,
  leaderboardHighlights: (accessToken: string | null, userId: number | null, regionCode: string | null) =>
    ['game', 'leaderboardHighlights', accessToken, userId, regionCode] as const,
  leaderboardPositionRankHistory: (
    accessToken: string | null,
    userId: number | null,
    positionId: number | null,
    regionCode: string | null,
  ) => ['game', 'leaderboardPositionRankHistory', accessToken, userId, positionId, regionCode] as const,
  market: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'market', accessToken, regionCode] as const,
  positions: (accessToken: string | null, regionCode: string | null, status = 'OPEN') =>
    ['game', 'positions', accessToken, regionCode, status] as const,
  positionRankHistory: (accessToken: string | null, positionId: number | null) =>
    ['game', 'positionRankHistory', accessToken, positionId] as const,
  sellPreview: (
    accessToken: string | null,
    regionCode: string | null,
    positionId: number | null,
    videoId: string | null,
    quantity: number | null,
  ) => ['game', 'sellPreview', accessToken, regionCode, positionId, videoId, quantity] as const,
  seasonCoinResult: (accessToken: string | null, seasonId: number | null) =>
    ['game', 'seasonCoinResult', accessToken, seasonId] as const,
};

interface InvalidateGameQueriesOptions {
  accessToken: string | null;
  includeLeaderboardPositions?: boolean;
  regionCode?: string | null;
  seasonId?: number | null;
}

export async function invalidateGameQueries(
  queryClient: QueryClient,
  { accessToken, includeLeaderboardPositions = false, regionCode = null, seasonId = null }: InvalidateGameQueriesOptions,
) {
  if (!accessToken) {
    return;
  }

  const invalidations = [];

  if (regionCode) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.currentSeason(accessToken, regionCode),
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.buyableMarketChart(accessToken, regionCode),
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.coinOverview(accessToken, regionCode),
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.coinTierProgress(accessToken, regionCode),
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.leaderboard(accessToken, regionCode),
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.highlights(accessToken, regionCode),
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.notifications(accessToken, regionCode),
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.market(accessToken, regionCode),
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: ['game', 'positions', accessToken, regionCode],
        refetchType: 'active',
      }),
    );
  } else {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: ['game', 'currentSeason', accessToken],
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: ['game', 'buyableMarketChart', accessToken],
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: ['game', 'coinOverview', accessToken],
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: ['game', 'coinTierProgress', accessToken],
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: ['game', 'leaderboard', accessToken],
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: ['game', 'highlights', accessToken],
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: ['game', 'notifications', accessToken],
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: ['game', 'market', accessToken],
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: ['game', 'positions', accessToken],
        refetchType: 'active',
      }),
    );
  }

  if (includeLeaderboardPositions) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: ['game', 'leaderboardPositions', accessToken],
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: ['game', 'leaderboardHighlights', accessToken],
        refetchType: 'active',
      }),
    );
  }

  if (typeof seasonId === 'number') {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.seasonCoinResult(accessToken, seasonId),
        refetchType: 'active',
      }),
    );
  }

  await Promise.all(invalidations);
}

export function useCurrentGameSeason(accessToken: string | null, regionCode: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: gameQueryKeys.currentSeason(accessToken, regionCode),
    queryFn: () => fetchCurrentGameSeason(accessToken as string, regionCode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useBuyableMarketChart(accessToken: string | null, regionCode: string, enabled = true) {
  return useInfiniteQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: gameQueryKeys.buyableMarketChart(accessToken, regionCode),
    queryFn: ({ pageParam }) => fetchBuyableMarketChart(accessToken as string, regionCode, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    staleTime: 1000 * 15,
  });
}

export function useGameMarket(accessToken: string | null, regionCode: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: gameQueryKeys.market(accessToken, regionCode),
    queryFn: () => fetchGameMarket(accessToken as string, regionCode),
    staleTime: 1000 * 30,
  });
}

export function useGameLeaderboard(accessToken: string | null, regionCode: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: gameQueryKeys.leaderboard(accessToken, regionCode),
    queryFn: () => fetchGameLeaderboard(accessToken as string, regionCode),
    staleTime: 1000 * 15,
  });
}

export function useGameHighlights(accessToken: string | null, regionCode: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: gameQueryKeys.highlights(accessToken, regionCode),
    queryFn: () => fetchGameHighlights(accessToken as string, regionCode),
    staleTime: 1000 * 15,
  });
}

export function useGameNotifications(accessToken: string | null, regionCode: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: gameQueryKeys.notifications(accessToken, regionCode),
    queryFn: () => fetchGameNotifications(accessToken as string, regionCode),
    staleTime: 1000 * 15,
  });
}

function removeNotificationFromSeason(season: GameCurrentSeason | undefined, notificationId: string) {
  if (!season?.notifications) {
    return season;
  }

  return {
    ...season,
    notifications: season.notifications.filter((notification) => notification.id !== notificationId),
  };
}

function clearNotificationsFromSeason(season: GameCurrentSeason | undefined) {
  return season?.notifications ? { ...season, notifications: [] } : season;
}

export function useMarkGameNotificationsRead(accessToken: string | null, regionCode: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markGameNotificationsRead(accessToken as string, regionCode),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.notifications(accessToken, regionCode),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.currentSeason(accessToken, regionCode),
        refetchType: 'active',
      });
    },
  });
}

export function useDeleteGameNotifications(accessToken: string | null, regionCode: string) {
  const queryClient = useQueryClient();
  const notificationsKey = gameQueryKeys.notifications(accessToken, regionCode);
  const seasonKey = gameQueryKeys.currentSeason(accessToken, regionCode);

  return useMutation({
    mutationFn: () => deleteGameNotifications(accessToken as string, regionCode),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationsKey }),
        queryClient.cancelQueries({ queryKey: seasonKey }),
      ]);

      const previousNotifications = queryClient.getQueryData<GameNotification[]>(notificationsKey);
      const previousSeason = queryClient.getQueryData<GameCurrentSeason>(seasonKey);

      queryClient.setQueryData<GameNotification[]>(notificationsKey, []);
      queryClient.setQueryData<GameCurrentSeason | undefined>(seasonKey, clearNotificationsFromSeason);

      return { previousNotifications, previousSeason };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(notificationsKey, context?.previousNotifications);
      queryClient.setQueryData(seasonKey, context?.previousSeason);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationsKey,
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: seasonKey,
          refetchType: 'active',
        }),
      ]);
    },
  });
}

export function useDeleteGameNotification(accessToken: string | null, regionCode: string) {
  const queryClient = useQueryClient();
  const notificationsKey = gameQueryKeys.notifications(accessToken, regionCode);
  const seasonKey = gameQueryKeys.currentSeason(accessToken, regionCode);

  return useMutation({
    mutationFn: (notificationId: string) => deleteGameNotification(accessToken as string, notificationId),
    onMutate: async (notificationId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationsKey }),
        queryClient.cancelQueries({ queryKey: seasonKey }),
      ]);

      const previousNotifications = queryClient.getQueryData<GameNotification[]>(notificationsKey);
      const previousSeason = queryClient.getQueryData<GameCurrentSeason>(seasonKey);

      queryClient.setQueryData<GameNotification[] | undefined>(notificationsKey, (notifications) =>
        notifications?.filter((notification) => notification.id !== notificationId),
      );
      queryClient.setQueryData<GameCurrentSeason | undefined>(seasonKey, (season) =>
        removeNotificationFromSeason(season, notificationId),
      );

      return { previousNotifications, previousSeason };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(notificationsKey, context?.previousNotifications);
      queryClient.setQueryData(seasonKey, context?.previousSeason);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationsKey,
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: seasonKey,
          refetchType: 'active',
        }),
      ]);
    },
  });
}

export function useGameCoinOverview(accessToken: string | null, regionCode: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: gameQueryKeys.coinOverview(accessToken, regionCode),
    queryFn: () => fetchGameCoinOverview(accessToken as string, regionCode),
    staleTime: 1000 * 15,
  });
}

export function useGameCoinTierProgress(accessToken: string | null, regionCode: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: gameQueryKeys.coinTierProgress(accessToken, regionCode),
    queryFn: () => fetchGameCoinTierProgress(accessToken as string, regionCode),
    staleTime: 1000 * 15,
  });
}

export function useGameLeaderboardPositions(
  accessToken: string | null,
  userId: number | null,
  regionCode: string,
  enabled = true,
) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && typeof userId === 'number' && Boolean(regionCode),
    queryKey: gameQueryKeys.leaderboardPositions(accessToken, userId, regionCode),
    queryFn: () => fetchGameLeaderboardPositions(accessToken as string, userId as number, regionCode),
    staleTime: 1000 * 15,
  });
}

export function useGameLeaderboardHighlights(
  accessToken: string | null,
  userId: number | null,
  regionCode: string,
  enabled = true,
) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && typeof userId === 'number' && Boolean(regionCode),
    queryKey: gameQueryKeys.leaderboardHighlights(accessToken, userId, regionCode),
    queryFn: () => fetchGameLeaderboardHighlights(accessToken as string, userId as number, regionCode),
    staleTime: 1000 * 15,
  });
}

export function useMyGamePositions(
  accessToken: string | null,
  regionCode: string,
  status = 'OPEN',
  enabled = true,
  limit?: number,
) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: [...gameQueryKeys.positions(accessToken, regionCode, status), limit ?? null],
    queryFn: () => fetchMyGamePositions(accessToken as string, regionCode, status, limit),
    staleTime: 1000 * 15,
  });
}

export function useGamePositionRankHistory(
  accessToken: string | null,
  positionId: number | null,
  enabled = true,
) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && typeof positionId === 'number',
    queryKey: gameQueryKeys.positionRankHistory(accessToken, positionId),
    queryFn: () => fetchGamePositionRankHistory(accessToken as string, positionId as number),
    staleTime: 1000 * 15,
  });
}

export function useGameSellPreview(
  accessToken: string | null,
  input: SellGamePositionsInput | null,
  enabled = true,
) {
  return useQuery({
    enabled:
      enabled &&
      Boolean(accessToken) &&
      Boolean(input?.regionCode) &&
      typeof input?.quantity === 'number' &&
      input.quantity > 0 &&
      (typeof input.positionId === 'number' || Boolean(input.videoId)),
    queryKey: gameQueryKeys.sellPreview(
      accessToken,
      input?.regionCode ?? null,
      input?.positionId ?? null,
      input?.videoId ?? null,
      input?.quantity ?? null,
    ),
    queryFn: () => fetchSellGamePreview(accessToken as string, input as SellGamePositionsInput),
    staleTime: 1000 * 5,
  });
}

export function useGameLeaderboardPositionRankHistory(
  accessToken: string | null,
  userId: number | null,
  positionId: number | null,
  regionCode: string,
  enabled = true,
) {
  return useQuery({
    enabled:
      enabled &&
      Boolean(accessToken) &&
      typeof userId === 'number' &&
      typeof positionId === 'number' &&
      Boolean(regionCode),
    queryKey: gameQueryKeys.leaderboardPositionRankHistory(accessToken, userId, positionId, regionCode),
    queryFn: () =>
      fetchGameLeaderboardPositionRankHistory(accessToken as string, userId as number, positionId as number, regionCode),
    staleTime: 1000 * 15,
  });
}

export function useMySeasonCoinResult(accessToken: string | null, seasonId: number | null, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && typeof seasonId === 'number',
    queryKey: gameQueryKeys.seasonCoinResult(accessToken, seasonId),
    queryFn: () => fetchMySeasonCoinResult(accessToken as string, seasonId as number),
    staleTime: 1000 * 60,
  });
}

export function useBuyGamePosition(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGamePositionInput) => {
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.');
      }

      return buyGamePosition(accessToken, input);
    },
    onSuccess: (_data, input) => {
      void invalidateGameQueries(queryClient, {
        accessToken,
        includeLeaderboardPositions: true,
        regionCode: input.regionCode,
      });
    },
  });
}

export function useSellGamePosition(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positionId: number) => {
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.');
      }

      return sellGamePosition(accessToken, positionId);
    },
    onSuccess: () => {
      void invalidateGameQueries(queryClient, {
        accessToken,
        includeLeaderboardPositions: true,
      });
    },
  });
}

export function useSellGamePositions(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SellGamePositionsInput) => {
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.');
      }

      return sellGamePositions(accessToken, input);
    },
    onSuccess: (_data, input) => {
      void invalidateGameQueries(queryClient, {
        accessToken,
        includeLeaderboardPositions: true,
        regionCode: input.regionCode,
      });
    },
  });
}
