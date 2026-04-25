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
  GamePosition,
  GameScheduledSellOrder,
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

type GamePositionsQuerySnapshot = [ReadonlyArray<unknown>, GamePosition[] | undefined];

interface ScheduledSellOptimisticContext {
  previousOrders?: GameScheduledSellOrder[];
  previousPositions: GamePositionsQuerySnapshot[];
}

interface OptimisticSellHistoryEntry {
  position: GamePosition;
}

interface SellPositionsOptimisticContext {
  previousHistoryPositions: GamePositionsQuerySnapshot[];
  previousOpenPositions: GamePositionsQuerySnapshot[];
}

function getGamePositionsQueryData(
  queryClient: QueryClient,
  accessToken: string | null,
  regionCode: string,
  status: string,
) {
  return queryClient.getQueriesData<GamePosition[]>({
    queryKey: ['game', 'positions', accessToken, regionCode, status],
  }) as GamePositionsQuerySnapshot[];
}

function getPositionUnitValue(value: number | null | undefined, quantity: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || quantity <= 0) {
    return null;
  }

  return value / quantity;
}

function pickOptimisticPositionValue(unitValue: number | null, quantity: number, fallback: number) {
  if (unitValue === null) {
    return fallback;
  }

  return Math.round(unitValue * quantity);
}

function buildOptimisticSellHistoryEntries(
  positions: GamePosition[],
  input: SellGamePositionsInput,
  soldAt: string,
) {
  let remainingQuantity = Math.max(0, Math.floor(input.quantity));
  let tempHistoryId = 1;
  const entries: OptimisticSellHistoryEntry[] = [];

  positions.forEach((position) => {
    if (remainingQuantity <= 0) {
      return;
    }

    const isTargetPosition =
      typeof input.positionId === 'number' ? position.id === input.positionId : position.videoId === input.videoId;

    if (!isTargetPosition || position.quantity <= 0) {
      return;
    }

    const soldQuantity = Math.min(position.quantity, remainingQuantity);

    if (soldQuantity <= 0) {
      return;
    }

    remainingQuantity -= soldQuantity;

    const stakeUnitValue = position.stakePoints / position.quantity;
    const currentPriceUnitValue = getPositionUnitValue(position.currentPricePoints, position.quantity);
    const profitUnitValue = getPositionUnitValue(position.profitPoints, position.quantity);
    const soldStakePoints = Math.round(stakeUnitValue * soldQuantity);
    const soldCurrentPricePoints = pickOptimisticPositionValue(
      currentPriceUnitValue,
      soldQuantity,
      soldStakePoints,
    );
    const soldProfitPoints =
      profitUnitValue === null ? soldCurrentPricePoints - soldStakePoints : Math.round(profitUnitValue * soldQuantity);

    entries.push({
      position: {
        ...position,
        id: -(Date.now() + tempHistoryId),
        quantity: soldQuantity,
        stakePoints: soldStakePoints,
        currentPricePoints: soldCurrentPricePoints,
        profitPoints: soldProfitPoints,
        status: 'CLOSED',
        closedAt: soldAt,
      },
    });
    tempHistoryId += 1;
  });

  return entries;
}

function applyOptimisticSellToOpenPositions(positions: GamePosition[], input: SellGamePositionsInput) {
  let remainingQuantity = Math.max(0, Math.floor(input.quantity));

  return positions.reduce<GamePosition[]>((nextPositions, position) => {
    if (remainingQuantity <= 0) {
      nextPositions.push(position);
      return nextPositions;
    }

    const isTargetPosition =
      typeof input.positionId === 'number' ? position.id === input.positionId : position.videoId === input.videoId;

    if (!isTargetPosition || position.quantity <= 0) {
      nextPositions.push(position);
      return nextPositions;
    }

    const soldQuantity = Math.min(position.quantity, remainingQuantity);

    if (soldQuantity <= 0) {
      nextPositions.push(position);
      return nextPositions;
    }

    remainingQuantity -= soldQuantity;

    if (soldQuantity >= position.quantity) {
      return nextPositions;
    }

    const remainingPositionQuantity = position.quantity - soldQuantity;
    const stakeUnitValue = position.stakePoints / position.quantity;
    const currentPriceUnitValue = getPositionUnitValue(position.currentPricePoints, position.quantity);
    const profitUnitValue = getPositionUnitValue(position.profitPoints, position.quantity);
    const remainingStakePoints = Math.round(stakeUnitValue * remainingPositionQuantity);
    const remainingCurrentPricePoints =
      currentPriceUnitValue === null ? null : Math.round(currentPriceUnitValue * remainingPositionQuantity);
    const remainingProfitPoints =
      profitUnitValue === null ? null : Math.round(profitUnitValue * remainingPositionQuantity);
    const remainingScheduledSellQuantity = Math.max(0, (position.scheduledSellQuantity ?? 0) - soldQuantity);

    nextPositions.push({
      ...position,
      quantity: remainingPositionQuantity,
      stakePoints: remainingStakePoints,
      currentPricePoints: remainingCurrentPricePoints,
      profitPoints: remainingProfitPoints,
      reservedForSell: remainingScheduledSellQuantity > 0,
      scheduledSellQuantity: remainingScheduledSellQuantity,
      scheduledSellOrderId: remainingScheduledSellQuantity > 0 ? position.scheduledSellOrderId ?? null : null,
      scheduledSellTargetRank:
        remainingScheduledSellQuantity > 0 ? position.scheduledSellTargetRank ?? null : null,
      scheduledSellTriggerDirection:
        remainingScheduledSellQuantity > 0 ? position.scheduledSellTriggerDirection ?? null : null,
    });

    return nextPositions;
  }, []);
}

function buildOptimisticScheduledSellOrder(
  input: CreateScheduledSellOrderInput,
  sourcePosition: GamePosition | null,
) {
  const now = new Date().toISOString();
  const quantity = Math.max(0, Math.floor(input.quantity));
  const sourceQuantity = sourcePosition?.quantity ?? 0;
  const unitStakePoints =
    sourcePosition && sourceQuantity > 0 ? sourcePosition.stakePoints / sourceQuantity : 0;

  return {
    id: -Date.now(),
    userId: 0,
    seasonId: 0,
    positionId: input.positionId,
    videoId: sourcePosition?.videoId ?? '',
    videoTitle: sourcePosition?.title ?? '',
    channelTitle: sourcePosition?.channelTitle ?? '',
    thumbnailUrl: sourcePosition?.thumbnailUrl ?? '',
    regionCode: input.regionCode,
    targetRank: input.targetRank,
    triggerDirection: input.triggerDirection,
    status: 'PENDING',
    currentRank: sourcePosition?.currentRank ?? null,
    buyRank: sourcePosition?.buyRank ?? 0,
    quantity,
    stakePoints: Math.round(unitStakePoints * quantity),
    sellPricePoints: null,
    settledPoints: null,
    pnlPoints: null,
    failureReason: null,
    triggeredAt: null,
    executedAt: null,
    canceledAt: null,
    createdAt: now,
    updatedAt: now,
  } satisfies GameScheduledSellOrder;
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
    onMutate: async (input) => {
      const openPositionsKey = ['game', 'positions', accessToken, input.regionCode, 'OPEN'] as const;
      const historyPositionsKey = ['game', 'positions', accessToken, input.regionCode, ''] as const;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: openPositionsKey }),
        queryClient.cancelQueries({ queryKey: historyPositionsKey }),
      ]);

      const previousOpenPositions = getGamePositionsQueryData(queryClient, accessToken, input.regionCode, 'OPEN');
      const previousHistoryPositions = getGamePositionsQueryData(queryClient, accessToken, input.regionCode, '');
      const sourceOpenPositions = previousOpenPositions[0]?.[1] ?? [];
      const soldAt = new Date().toISOString();
      const optimisticHistoryEntries = buildOptimisticSellHistoryEntries(sourceOpenPositions, input, soldAt);

      previousOpenPositions.forEach(([queryKey]) => {
        queryClient.setQueryData<GamePosition[]>(queryKey, (positions) =>
          positions ? applyOptimisticSellToOpenPositions(positions, input) : positions,
        );
      });

      previousHistoryPositions.forEach(([queryKey]) => {
        queryClient.setQueryData<GamePosition[]>(queryKey, (positions) => {
          const nextPositions = positions ? [...positions] : [];

          optimisticHistoryEntries.forEach(({ position }) => {
            nextPositions.unshift(position);
          });

          return nextPositions;
        });
      });

      return {
        previousHistoryPositions,
        previousOpenPositions,
      } satisfies SellPositionsOptimisticContext;
    },
    onError: (_error, _input, context) => {
      context?.previousOpenPositions.forEach(([queryKey, positions]) => {
        queryClient.setQueryData(queryKey, positions);
      });
      context?.previousHistoryPositions.forEach(([queryKey, positions]) => {
        queryClient.setQueryData(queryKey, positions);
      });
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
    onMutate: async (input) => {
      const scheduledOrdersKey = gameQueryKeys.scheduledSellOrders(accessToken, input.regionCode);
      const positionsKey = ['game', 'positions', accessToken, input.regionCode, 'OPEN'] as const;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: scheduledOrdersKey }),
        queryClient.cancelQueries({ queryKey: positionsKey }),
      ]);

      const previousOrders = queryClient.getQueryData<GameScheduledSellOrder[]>(scheduledOrdersKey);
      const previousPositions = getGamePositionsQueryData(queryClient, accessToken, input.regionCode, 'OPEN');
      const sourcePosition =
        previousPositions.flatMap(([, positions]) => positions ?? []).find((position) => position.id === input.positionId) ??
        null;
      const optimisticOrder = buildOptimisticScheduledSellOrder(input, sourcePosition);

      queryClient.setQueryData<GameScheduledSellOrder[]>(scheduledOrdersKey, (orders) => [
        optimisticOrder,
        ...(orders ?? []),
      ]);

      previousPositions.forEach(([queryKey]) => {
        queryClient.setQueryData<GamePosition[]>(queryKey, (positions) =>
          (positions ?? []).map((position) =>
            position.id === input.positionId
              ? {
                  ...position,
                  reservedForSell: true,
                  scheduledSellOrderId: optimisticOrder.id,
                  scheduledSellQuantity: input.quantity,
                  scheduledSellTargetRank: input.targetRank,
                  scheduledSellTriggerDirection: input.triggerDirection,
                }
              : position,
          ),
        );
      });

      return {
        previousOrders,
        previousPositions,
      } satisfies ScheduledSellOptimisticContext;
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(
        gameQueryKeys.scheduledSellOrders(accessToken, _input.regionCode),
        context?.previousOrders,
      );
      context?.previousPositions.forEach(([queryKey, positions]) => {
        queryClient.setQueryData(queryKey, positions);
      });
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
  const scheduledOrdersKey = gameQueryKeys.scheduledSellOrders(accessToken, regionCode);
  const positionsKey = ['game', 'positions', accessToken, regionCode] as const;

  return useMutation({
    mutationFn: async (orderId: number) => {
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.');
      }

      return cancelScheduledSellOrder(accessToken, orderId);
    },
    onMutate: async (orderId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: scheduledOrdersKey }),
        queryClient.cancelQueries({ queryKey: positionsKey }),
      ]);

      const previousOrders = queryClient.getQueryData<GameScheduledSellOrder[]>(scheduledOrdersKey);
      const previousPositions = queryClient.getQueriesData<GamePosition[]>({ queryKey: positionsKey });
      const targetOrder = previousOrders?.find((order) => order.id === orderId) ?? null;

      if (targetOrder) {
        queryClient.setQueryData<GameScheduledSellOrder[]>(scheduledOrdersKey, (orders) =>
          (orders ?? []).map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  canceledAt: new Date().toISOString(),
                  failureReason: null,
                  status: 'CANCELED',
                  updatedAt: new Date().toISOString(),
                }
              : order,
          ),
        );

        previousPositions.forEach(([queryKey]) => {
          queryClient.setQueryData<GamePosition[]>(queryKey, (positions) =>
            (positions ?? []).map((position) =>
              position.id === targetOrder.positionId && position.scheduledSellOrderId === orderId
                ? {
                    ...position,
                    reservedForSell: false,
                    scheduledSellOrderId: null,
                    scheduledSellQuantity: 0,
                    scheduledSellTargetRank: null,
                    scheduledSellTriggerDirection: null,
                  }
                : position,
            ),
          );
        });
      }

      return {
        previousOrders,
        previousPositions,
      };
    },
    onError: (_error, _orderId, context) => {
      queryClient.setQueryData(scheduledOrdersKey, context?.previousOrders);
      context?.previousPositions.forEach(([queryKey, positions]) => {
        queryClient.setQueryData(queryKey, positions);
      });
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
