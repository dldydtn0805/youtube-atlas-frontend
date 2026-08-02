import { useEffect, useState } from 'react';
import {
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { authQueryKeys } from '../auth/queries';
import type { AuthUser } from '../auth/types';
import type { YouTubeCategorySection } from '../youtube/types';
import {
  cancelScheduledSellOrder,
  fetchAchievementTitles,
  fetchGameAccountState,
  fetchBuyableMarketChart,
  buyGamePosition,
  createScheduledSellOrder,
  deleteGameNotification,
  deleteGameNotifications,
  fetchSellGamePreview,
  fetchCurrentGameSeason,
  fetchGameHighlights,
  fetchGameBootstrap,
  fetchGameLeaderboard,
  fetchGameLeaderboardHighlights,
  fetchGameLeaderboardPositionRankHistory,
  fetchGameLeaderboardPositions,
  fetchGameMarket,
  fetchGameNotifications,
  fetchGamePositionRankHistory,
  fetchMyGameSeasonResults,
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
  GameAccountState,
  GameNotification,
  GamePosition,
  GameScheduledSellOrder,
  GameSeasonResult,
  GameWallet,
  SellGamePositionsInput,
} from './types';

export const GAME_SCOPE_QUERY_KEY = 'GLOBAL';

function getGameScopeQueryKey(regionCode: string | null) {
  void regionCode;
  return GAME_SCOPE_QUERY_KEY;
}

export const gameQueryKeys = {
  accountState: (accessToken: string | null) => ['game', 'accountState', accessToken] as const,
  buyableMarketChart: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'buyableMarketChart', accessToken, regionCode] as const,
  currentSeason: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'currentSeason', accessToken, getGameScopeQueryKey(regionCode)] as const,
  seasonResults: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'seasonResults', accessToken, getGameScopeQueryKey(regionCode)] as const,
  tierProgress: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'tierProgress', accessToken, getGameScopeQueryKey(regionCode)] as const,
  leaderboard: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'leaderboard', accessToken, getGameScopeQueryKey(regionCode)] as const,
  highlights: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'highlights', accessToken, getGameScopeQueryKey(regionCode)] as const,
  notifications: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'notifications', accessToken, getGameScopeQueryKey(regionCode)] as const,
  leaderboardPositions: (accessToken: string | null, userId: number | null, regionCode: string | null) =>
    ['game', 'leaderboardPositions', accessToken, userId, getGameScopeQueryKey(regionCode)] as const,
  leaderboardHighlights: (accessToken: string | null, userId: number | null, regionCode: string | null) =>
    ['game', 'leaderboardHighlights', accessToken, userId, getGameScopeQueryKey(regionCode)] as const,
  leaderboardPositionRankHistory: (
    accessToken: string | null,
    userId: number | null,
    positionId: number | null,
    regionCode: string | null,
  ) =>
    [
      'game',
      'leaderboardPositionRankHistory',
      accessToken,
      userId,
      positionId,
      getGameScopeQueryKey(regionCode),
    ] as const,
  market: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'market', accessToken, regionCode] as const,
  positions: (accessToken: string | null, regionCode: string | null, status = 'OPEN') =>
    ['game', 'positions', accessToken, getGameScopeQueryKey(regionCode), status] as const,
  scheduledSellOrders: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'scheduledSellOrders', accessToken, getGameScopeQueryKey(regionCode)] as const,
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
  void regionCode;
  return queryClient.getQueriesData<GamePosition[]>({
    queryKey: ['game', 'positions', accessToken, GAME_SCOPE_QUERY_KEY, status],
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
      scheduledSellTriggerType:
        remainingScheduledSellQuantity > 0 ? position.scheduledSellTriggerType ?? null : null,
      scheduledSellTargetRank:
        remainingScheduledSellQuantity > 0 ? position.scheduledSellTargetRank ?? null : null,
      scheduledSellTargetProfitRatePercent:
        remainingScheduledSellQuantity > 0 ? position.scheduledSellTargetProfitRatePercent ?? null : null,
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
    triggerType: input.triggerType,
    targetRank: input.targetRank ?? null,
    targetProfitRatePercent: input.targetProfitRatePercent ?? null,
    triggerDirection: input.triggerDirection ?? 'RANK_IMPROVES_TO',
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

function getPendingScheduledSellOrdersForPosition(
  orders: GameScheduledSellOrder[],
  positionId: number,
) {
  return orders.filter((order) => order.positionId === positionId && order.status === 'PENDING');
}

function applyScheduledSellSummaryToPosition(
  position: GamePosition,
  pendingOrders: GameScheduledSellOrder[],
) {
  const primaryOrder = pendingOrders[0] ?? null;
  const scheduledSellQuantity = pendingOrders.reduce(
    (totalQuantity, order) => totalQuantity + order.quantity,
    0,
  );

  return {
    ...position,
    reservedForSell: scheduledSellQuantity > 0,
    scheduledSellOrderId: primaryOrder?.id ?? null,
    scheduledSellQuantity,
    scheduledSellTriggerType: primaryOrder?.triggerType ?? null,
    scheduledSellTargetRank: primaryOrder?.targetRank ?? null,
    scheduledSellTargetProfitRatePercent: primaryOrder?.targetProfitRatePercent ?? null,
    scheduledSellTriggerDirection: primaryOrder?.triggerDirection ?? null,
  } satisfies GamePosition;
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
        queryKey: ['game', 'positions', accessToken, GAME_SCOPE_QUERY_KEY],
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

export function applyGameAccountState(
  queryClient: QueryClient,
  accessToken: string | null,
  state: GameAccountState,
) {
  if (!accessToken) {
    return;
  }

  queryClient.setQueryData(gameQueryKeys.accountState(accessToken), state);
  queryClient.setQueriesData<GameCurrentSeason>(
    { queryKey: ['game', 'currentSeason', accessToken] },
    (season) => (season ? { ...season, wallet: state.wallet } : season),
  );
  queryClient.setQueriesData(
    { queryKey: ['game', 'tierProgress', accessToken] },
    state.tierProgress,
  );
  queryClient.setQueriesData<GamePosition[]>(
    { queryKey: ['game', 'positions', accessToken, GAME_SCOPE_QUERY_KEY, 'OPEN'] },
    state.openPositions,
  );
  queryClient.setQueriesData<GamePosition[]>(
    { queryKey: ['game', 'positions', accessToken, GAME_SCOPE_QUERY_KEY, ''] },
    state.positionHistory,
  );
}

export function applyGameWalletRealtimeUpdate(
  queryClient: QueryClient,
  accessToken: string | null,
  walletUpdate: Partial<GameWallet>,
) {
  if (!accessToken) {
    return;
  }

  queryClient.setQueriesData<GameCurrentSeason>(
    { queryKey: ['game', 'currentSeason', accessToken] },
    (season) =>
      season
        ? {
            ...season,
            wallet: {
              ...season.wallet,
              ...walletUpdate,
            },
          }
        : season,
  );
}

export async function refreshGameAccountState(
  queryClient: QueryClient,
  accessToken: string | null,
) {
  if (!accessToken) {
    return null;
  }

  const state = await queryClient.fetchQuery({
    queryKey: gameQueryKeys.accountState(accessToken),
    queryFn: () => fetchGameAccountState(accessToken),
    staleTime: 0,
  });
  applyGameAccountState(queryClient, accessToken, state);
  return state;
}

async function refreshTradeDerivedQueries(
  queryClient: QueryClient,
  accessToken: string | null,
  regionCode: string | null,
) {
  if (!accessToken) {
    return;
  }

  const activeRefreshes = regionCode
    ? [
        queryClient.invalidateQueries({
          queryKey: gameQueryKeys.market(accessToken, regionCode),
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: gameQueryKeys.buyableMarketChart(accessToken, regionCode),
          refetchType: 'active',
        }),
      ]
    : [];
  const staleOnlyPrefixes = [
    ['game', 'leaderboard', accessToken],
    ['game', 'highlights', accessToken],
    ['game', 'notifications', accessToken],
    ['game', 'leaderboardPositions', accessToken],
    ['game', 'leaderboardHighlights', accessToken],
    ['game', 'leaderboardPositionRankHistory', accessToken],
    gameQueryKeys.achievementTitles(accessToken),
  ];

  await Promise.all([
    ...activeRefreshes,
    ...staleOnlyPrefixes.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, refetchType: 'none' }),
    ),
  ]);
}

async function refreshScheduledSellQueries(
  queryClient: QueryClient,
  accessToken: string | null,
  regionCode: string,
) {
  if (!accessToken) {
    return;
  }

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: gameQueryKeys.scheduledSellOrders(accessToken, regionCode),
      refetchType: 'active',
    }),
    queryClient.invalidateQueries({
      queryKey: ['game', 'positions', accessToken, GAME_SCOPE_QUERY_KEY, 'OPEN'],
      refetchType: 'active',
    }),
  ]);
}

export function useGameBootstrap(
  accessToken: string | null,
  regionCode: string,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const bootstrapKey = accessToken ? `${accessToken}:${regionCode}` : null;
  const query = useQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: ['game', 'bootstrap', accessToken, regionCode],
    queryFn: () => fetchGameBootstrap(accessToken as string, regionCode),
    staleTime: 1000 * 15,
  });

  useEffect(() => {
    setHydratedKey(null);
  }, [bootstrapKey]);

  useEffect(() => {
    if (!query.data || !accessToken || query.data.regionCode !== regionCode) {
      return;
    }

    queryClient.setQueryData(
      gameQueryKeys.currentSeason(accessToken, regionCode),
      query.data.currentSeason,
    );
    queryClient.setQueryData<InfiniteData<YouTubeCategorySection>>(
      gameQueryKeys.buyableMarketChart(accessToken, regionCode),
      {
        pageParams: [undefined],
        pages: [query.data.buyableMarketChart],
      },
    );
    queryClient.setQueryData(
      gameQueryKeys.market(accessToken, regionCode),
      query.data.market,
    );
    queryClient.setQueryData(
      gameQueryKeys.tierProgress(accessToken, regionCode),
      query.data.tierProgress,
    );
    queryClient.setQueryData(
      gameQueryKeys.leaderboard(accessToken, regionCode),
      query.data.leaderboard,
    );
    queryClient.setQueryData(
      gameQueryKeys.achievementTitles(accessToken),
      query.data.achievementTitles,
    );
    queryClient.setQueryData(
      [...gameQueryKeys.positions(accessToken, regionCode, 'OPEN'), null],
      query.data.openPositions,
    );
    queryClient.setQueryData(
      [...gameQueryKeys.positions(accessToken, regionCode, ''), 30],
      query.data.positionHistory,
    );
    queryClient.setQueryData(
      gameQueryKeys.scheduledSellOrders(accessToken, regionCode),
      query.data.scheduledSellOrders,
    );
    queryClient.setQueryData(
      gameQueryKeys.highlights(accessToken, regionCode),
      query.data.highlights,
    );
    queryClient.setQueryData(
      gameQueryKeys.notifications(accessToken, regionCode),
      query.data.notifications,
    );
    queryClient.setQueryData(
      gameQueryKeys.seasonResults(accessToken, regionCode),
      query.data.seasonResults,
    );
    setHydratedKey(bootstrapKey);
  }, [accessToken, bootstrapKey, query.data, queryClient, regionCode]);

  return {
    ...query,
    isHydrated: bootstrapKey !== null && hydratedKey === bootstrapKey,
  };
}

export function useCurrentGameSeason(accessToken: string | null, regionCode: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: gameQueryKeys.currentSeason(accessToken, regionCode),
    queryFn: () => fetchCurrentGameSeason(accessToken as string, regionCode),
    staleTime: 1000 * 15,
    refetchOnMount: false,
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
    enabled: enabled && Boolean(regionCode),
    queryKey: gameQueryKeys.market(accessToken, regionCode),
    queryFn: () => fetchGameMarket(accessToken, regionCode),
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

export function useMyGameSeasonResults(
  accessToken: string | null,
  regionCode: string,
  enabled = true,
) {
  return useQuery<GameSeasonResult[]>({
    enabled: enabled && Boolean(accessToken) && Boolean(regionCode),
    queryKey: gameQueryKeys.seasonResults(accessToken, regionCode),
    queryFn: () => fetchMyGameSeasonResults(accessToken as string, regionCode),
    staleTime: 1000 * 60,
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
    onSuccess: (data, input) => {
      applyGameAccountState(queryClient, accessToken, data.state);
      void refreshTradeDerivedQueries(queryClient, accessToken, input.regionCode);
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
    onSuccess: (data) => {
      applyGameAccountState(queryClient, accessToken, data.state);
      void refreshTradeDerivedQueries(queryClient, accessToken, null);
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
      const openPositionsKey = ['game', 'positions', accessToken, GAME_SCOPE_QUERY_KEY, 'OPEN'] as const;
      const historyPositionsKey = ['game', 'positions', accessToken, GAME_SCOPE_QUERY_KEY, ''] as const;

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
    onSuccess: (data, input) => {
      applyGameAccountState(queryClient, accessToken, data.state);
      void refreshTradeDerivedQueries(queryClient, accessToken, input.regionCode);
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
      const positionsKey = ['game', 'positions', accessToken, GAME_SCOPE_QUERY_KEY, 'OPEN'] as const;

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
      const nextOrders = [optimisticOrder, ...(previousOrders ?? [])];

      queryClient.setQueryData<GameScheduledSellOrder[]>(scheduledOrdersKey, nextOrders);

      previousPositions.forEach(([queryKey]) => {
        queryClient.setQueryData<GamePosition[]>(queryKey, (positions) =>
          (positions ?? []).map((position) =>
            position.id === input.positionId
              ? applyScheduledSellSummaryToPosition(
                  position,
                  getPendingScheduledSellOrdersForPosition(nextOrders, input.positionId),
                )
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
      void refreshScheduledSellQueries(queryClient, accessToken, input.regionCode);
    },
  });
}

export function useCancelScheduledSellOrder(accessToken: string | null, regionCode: string) {
  const queryClient = useQueryClient();
  const scheduledOrdersKey = gameQueryKeys.scheduledSellOrders(accessToken, regionCode);
  const positionsKey = ['game', 'positions', accessToken, GAME_SCOPE_QUERY_KEY] as const;

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
        const canceledAt = new Date().toISOString();
        const nextOrders = (previousOrders ?? []).map((order) =>
          order.id === orderId
            ? {
                ...order,
                canceledAt,
                failureReason: null,
                status: 'CANCELED' as const,
                updatedAt: canceledAt,
              }
            : order,
        );
        const remainingPendingOrders = getPendingScheduledSellOrdersForPosition(
          nextOrders,
          targetOrder.positionId,
        );

        queryClient.setQueryData<GameScheduledSellOrder[]>(scheduledOrdersKey, nextOrders);

        previousPositions.forEach(([queryKey]) => {
          queryClient.setQueryData<GamePosition[]>(queryKey, (positions) =>
            (positions ?? []).map((position) =>
              position.id === targetOrder.positionId
                ? applyScheduledSellSummaryToPosition(position, remainingPendingOrders)
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
      void refreshScheduledSellQueries(queryClient, accessToken, regionCode);
    },
  });
}
