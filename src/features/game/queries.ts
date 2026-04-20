import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchBuyableMarketChart,
  buyGamePosition,
  fetchCurrentGameSeason,
  fetchGameCoinOverview,
  fetchGameCoinTierProgress,
  fetchGameHighlights,
  fetchGameLeaderboard,
  fetchGameLeaderboardHighlights,
  fetchGameLeaderboardPositionRankHistory,
  fetchGameLeaderboardPositions,
  fetchGameMarket,
  fetchGamePositionRankHistory,
  fetchMySeasonCoinResult,
  fetchMyGamePositions,
  sellGamePosition,
  sellGamePositions,
} from './api';
import type { CreateGamePositionInput, SellGamePositionsInput } from './types';

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
    onSuccess: async (_data, input) => {
      await invalidateGameQueries(queryClient, {
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
    onSuccess: async () => {
      await invalidateGameQueries(queryClient, {
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
    onSuccess: async (_data, input) => {
      await invalidateGameQueries(queryClient, {
        accessToken,
        includeLeaderboardPositions: true,
        regionCode: input.regionCode,
      });
    },
  });
}
