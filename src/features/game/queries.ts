import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buyGamePosition,
  fetchCurrentGameSeason,
  fetchGameCoinOverview,
  fetchGameCoinTierProgress,
  fetchGameLeaderboard,
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
  currentSeason: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'currentSeason', accessToken, regionCode] as const,
  coinOverview: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'coinOverview', accessToken, regionCode] as const,
  coinTierProgress: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'coinTierProgress', accessToken, regionCode] as const,
  leaderboard: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'leaderboard', accessToken, regionCode] as const,
  leaderboardPositions: (accessToken: string | null, userId: number | null, regionCode: string | null) =>
    ['game', 'leaderboardPositions', accessToken, userId, regionCode] as const,
  market: (accessToken: string | null, regionCode: string | null) =>
    ['game', 'market', accessToken, regionCode] as const,
  positions: (accessToken: string | null, regionCode: string | null, status = 'OPEN') =>
    ['game', 'positions', accessToken, regionCode, status] as const,
  positionRankHistory: (accessToken: string | null, positionId: number | null) =>
    ['game', 'positionRankHistory', accessToken, positionId] as const,
  seasonCoinResult: (accessToken: string | null, seasonId: number | null) =>
    ['game', 'seasonCoinResult', accessToken, seasonId] as const,
};

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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['game', 'currentSeason', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'coinOverview', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'coinTierProgress', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'leaderboard', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'market', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'positions', accessToken] }),
      ]);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['game', 'currentSeason', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'coinOverview', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'coinTierProgress', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'leaderboard', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'market', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'positions', accessToken] }),
      ]);
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['game', 'currentSeason', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'coinOverview', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'coinTierProgress', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'leaderboard', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'market', accessToken] }),
        queryClient.invalidateQueries({ queryKey: ['game', 'positions', accessToken] }),
      ]);
    },
  });
}
