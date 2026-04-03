import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buyGamePosition,
  fetchCurrentGameSeason,
  fetchGameLeaderboard,
  fetchGameMarket,
  fetchMyGamePositions,
  sellGamePosition,
} from './api';
import type { CreateGamePositionInput } from './types';

export const gameQueryKeys = {
  currentSeason: (accessToken: string | null) => ['game', 'currentSeason', accessToken] as const,
  leaderboard: (accessToken: string | null) => ['game', 'leaderboard', accessToken] as const,
  market: (accessToken: string | null) => ['game', 'market', accessToken] as const,
  positions: (accessToken: string | null, status = 'OPEN') =>
    ['game', 'positions', accessToken, status] as const,
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

export function useMyGamePositions(
  accessToken: string | null,
  status = 'OPEN',
  enabled = true,
) {
  return useQuery({
    enabled: enabled && Boolean(accessToken),
    queryKey: gameQueryKeys.positions(accessToken, status),
    queryFn: () => fetchMyGamePositions(accessToken as string, status),
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
