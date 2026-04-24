import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authQueryKeys } from '../auth/queries';
import type { AuthUser } from '../auth/types';
import {
  cancelScheduledSellOrder,
  fetchAchievementTitles,
  fetchBuyableMarketChart,
  buyGamePosition,
  createScheduledSellOrder,
  deleteGameNotification,
  deleteGameNotifications,
  fetchSellGamePreview,
  fetchCurrentGameSeason,
  fetchGameHighlights,
  fetchGameLeaderboard,
  fetchGameLeaderboardHighlights,
  fetchGameLeaderboardPositionRankHistory,
  fetchGameLeaderboardPositions,
  fetchGameMarket,
  fetchGameNotifications,
  fetchGamePositionRankHistory,
  fetchScheduledSellOrders,
  fetchGameTierProgress,
  fetchMyGamePositions,
  markGameNotificationsRead,
  sellGamePosition,
  sellGamePositions,
  updateSelectedAchievementTitle,
} from './api';
import type {
  AchievementTitleCollection,
  CreateScheduledSellOrderInput,
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
  tierProgress: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'tierProgress', accessToken, regionCode] as const,
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
  scheduledSellOrders: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'scheduledSellOrders', accessToken, regionCode] as const,
  positionRankHistory: (accessToken: string | null, positionId: number | null) =>
    ['game', 'positionRankHistory', accessToken, positionId] as const,
  sellPreview: (
    accessToken: string | null,
    regionCode: string | null,
    positionId: number | null,
    videoId: string | null,
    quantity: number | null,
  ) => ['game', 'sellPreview', accessToken, regionCode, positionId, videoId, quantity] as const,
  achievementTitles: (accessToken: string | null) => ['game', 'achievementTitles', accessToken] as const,
};

interface InvalidateGameQueriesOptions {
  accessToken: string | null;
  includeLeaderboardPositions?: boolean;
  regionCode?: string | null;
}

export async function invalidateGameQueries(
  queryClient: QueryClient,
  { accessToken, includeLeaderboardPositions = false, regionCode = null }: InvalidateGameQueriesOptions,
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
        queryKey: gameQueryKeys.tierProgress(accessToken, regionCode),
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
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.scheduledSellOrders(accessToken, regionCode),
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.achievementTitles(accessToken),
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
        queryKey: ['game', 'tierProgress', accessToken],
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
      queryClient.invalidateQueries({
        queryKey: ['game', 'scheduledSellOrders', accessToken],
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: gameQueryKeys.achievementTitles(accessToken),
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

export function useAchievementTitles(accessToken: string | null, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken),
    queryKey: gameQueryKeys.achievementTitles(accessToken),
    queryFn: () => fetchAchievementTitles(accessToken as string),
    staleTime: 1000 * 30,
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

function markNotificationsAsRead(notifications: GameNotification[] | undefined, readAt: string) {
  if (!notifications) {
    return notifications;
  }

  return notifications.map((notification) =>
    notification.readAt
      ? notification
      : {
          ...notification,
          readAt,
        },
  );
}

function markNotificationsReadInSeason(season: GameCurrentSeason | undefined, readAt: string) {
  if (!season?.notifications) {
    return season;
  }

  return {
    ...season,
    notifications: markNotificationsAsRead(season.notifications, readAt),
  };
}

export function useMarkGameNotificationsRead(accessToken: string | null, regionCode: string) {
  const queryClient = useQueryClient();
  const notificationsKey = gameQueryKeys.notifications(accessToken, regionCode);
  const seasonKey = gameQueryKeys.currentSeason(accessToken, regionCode);

  return useMutation({
    mutationFn: () => markGameNotificationsRead(accessToken as string, regionCode),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationsKey }),
        queryClient.cancelQueries({ queryKey: seasonKey }),
      ]);

      const previousNotifications = queryClient.getQueryData<GameNotification[]>(notificationsKey);
      const previousSeason = queryClient.getQueryData<GameCurrentSeason>(seasonKey);
      const readAt = new Date().toISOString();

      queryClient.setQueryData<GameNotification[] | undefined>(notificationsKey, (notifications) =>
        markNotificationsAsRead(notifications, readAt),
      );
      queryClient.setQueryData<GameCurrentSeason | undefined>(seasonKey, (season) =>
        markNotificationsReadInSeason(season, readAt),
      );

      return { previousNotifications, previousSeason };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(notificationsKey, context?.previousNotifications);
      queryClient.setQueryData(seasonKey, context?.previousSeason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationsKey,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: seasonKey,
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

export function useUpdateSelectedAchievementTitle(accessToken: string | null, regionCode: string | null) {
  const queryClient = useQueryClient();
  const titlesKey = gameQueryKeys.achievementTitles(accessToken);
  const currentUserKey = authQueryKeys.currentUser(accessToken);

  return useMutation({
    mutationFn: (titleCode: string | null) => {
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.');
      }

      return updateSelectedAchievementTitle(accessToken, titleCode);
    },
    onMutate: async (titleCode) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: titlesKey }),
        queryClient.cancelQueries({ queryKey: currentUserKey }),
      ]);

      const previousTitles = queryClient.getQueryData<AchievementTitleCollection>(titlesKey);
      const previousUser = queryClient.getQueryData<AuthUser>(currentUserKey);
      const optimisticSelectedTitle =
        titleCode && previousTitles
          ? previousTitles.titles.find((title) => title.code === titleCode && title.earned) ?? null
          : null;

      queryClient.setQueryData<AchievementTitleCollection | undefined>(titlesKey, (currentTitles) => {
        if (!currentTitles) {
          return currentTitles;
        }

        return {
          selectedTitle: optimisticSelectedTitle,
          titles: currentTitles.titles.map((title) => ({
            ...title,
            selected: titleCode !== null && title.code === titleCode,
          })),
        };
      });

      queryClient.setQueryData<AuthUser | undefined>(currentUserKey, (currentUser) => {
        if (!currentUser) {
          return currentUser;
        }

        return {
          ...currentUser,
          selectedTitle: optimisticSelectedTitle,
        };
      });

      return { previousTitles, previousUser };
    },
    onError: (_error, _titleCode, context) => {
      queryClient.setQueryData(titlesKey, context?.previousTitles);
      queryClient.setQueryData(currentUserKey, context?.previousUser);
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(titlesKey, data);
      queryClient.setQueryData<AuthUser | undefined>(currentUserKey, (currentUser) =>
        currentUser
          ? {
              ...currentUser,
              selectedTitle: data.selectedTitle,
            }
          : currentUser,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: titlesKey,
          refetchType: 'active',
        }),
        regionCode
          ? queryClient.invalidateQueries({
              queryKey: gameQueryKeys.leaderboard(accessToken, regionCode),
              refetchType: 'active',
            })
          : Promise.resolve(),
      ]);
    },
  });
}

export function useGameTierProgress(accessToken: string | null, regionCode: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: gameQueryKeys.tierProgress(accessToken, regionCode),
    queryFn: () => fetchGameTierProgress(accessToken as string, regionCode),
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

export function useScheduledSellOrders(accessToken: string | null, regionCode: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: gameQueryKeys.scheduledSellOrders(accessToken, regionCode),
    queryFn: () => fetchScheduledSellOrders(accessToken as string, regionCode),
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

export function useCreateScheduledSellOrder(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateScheduledSellOrderInput) => {
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.');
      }

      return createScheduledSellOrder(accessToken, input);
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

export function useCancelScheduledSellOrder(accessToken: string | null, regionCode: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: number) => {
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.');
      }

      return cancelScheduledSellOrder(accessToken, orderId);
    },
    onSuccess: () => {
      void invalidateGameQueries(queryClient, {
        accessToken,
        includeLeaderboardPositions: true,
        regionCode,
      });
    },
  });
}
