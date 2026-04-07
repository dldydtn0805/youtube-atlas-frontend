import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buyGamePosition,
  fetchCurrentGameSeason,
  fetchGameLeaderboard,
  fetchGameLeaderboardPositions,
  fetchGameMarket,
  fetchGamePositionRankHistory,
  fetchMyGamePositions,
  sellGamePosition,
  sellGamePositions,
} from './api';
import type { CreateGamePositionInput, SellGamePositionsInput } from './types';

export const gameQueryKeys = {
  currentSeason: (accessToken: string | null) => ['game', 'currentSeason', accessToken] as const,
  leaderboard: (accessToken: string | null) => ['game', 'leaderboard', accessToken] as const,
  leaderboardPositions: (accessToken: string | null, userId: number | null) =>
    ['game', 'leaderboardPositions', accessToken, userId] as const,
  market: (accessToken: string | null) => ['game', 'market', accessToken] as const,
  positions: (accessToken: string | null, status = 'OPEN') =>
    ['game', 'positions', accessToken, status] as const,
  positionRankHistory: (accessToken: string | null, positionId: number | null) =>
    ['game', 'positionRankHistory', accessToken, positionId] as const,
};

export function useCurrentGameSeason(accessToken: string | null, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken),
    queryKey: gameQueryKeys.currentSeason(accessToken),
    queryFn: () => fetchCurrentGameSeason(accessToken as string),
    staleTime: 1000 * 30,
  });
}

export function useGameMarket(accessToken: string | null, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken),
    queryKey: gameQueryKeys.market(accessToken),
    queryFn: () => fetchGameMarket(accessToken as string),
    staleTime: 1000 * 30,
  });
}

export function useGameLeaderboard(accessToken: string | null, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken),
    queryKey: gameQueryKeys.leaderboard(accessToken),
    queryFn: () => fetchGameLeaderboard(accessToken as string),
    staleTime: 1000 * 15,
  });
}

export function useGameLeaderboardPositions(
  accessToken: string | null,
  userId: number | null,
  enabled = true,
) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && typeof userId === 'number',
    queryKey: gameQueryKeys.leaderboardPositions(accessToken, userId),
    queryFn: () => fetchGameLeaderboardPositions(accessToken as string, userId as number),
    staleTime: 1000 * 15,
  });
}

export function useMyGamePositions(
  accessToken: string | null,
  status = 'OPEN',
  enabled = true,
  limit?: number,
) {
  return useQuery({
    enabled: enabled && Boolean(accessToken),
    queryKey: [...gameQueryKeys.positions(accessToken, status), limit ?? null],
    queryFn: () => fetchMyGamePositions(accessToken as string, status, limit),
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
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.currentSeason(accessToken) }),
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.leaderboard(accessToken) }),
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.market(accessToken) }),
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.positions(accessToken, '') }),
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.positions(accessToken, 'OPEN') }),
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
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.currentSeason(accessToken) }),
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.leaderboard(accessToken) }),
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.market(accessToken) }),
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.positions(accessToken, '') }),
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.positions(accessToken, 'OPEN') }),
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
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.currentSeason(accessToken) }),
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.leaderboard(accessToken) }),
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.market(accessToken) }),
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.positions(accessToken, '') }),
        queryClient.invalidateQueries({ queryKey: gameQueryKeys.positions(accessToken, 'OPEN') }),
      ]);
    },
  });
}
