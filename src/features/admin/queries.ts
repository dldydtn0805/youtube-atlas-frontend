import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  closeAdminSeason,
  deleteAdminUser,
  fetchAdminDashboard,
  fetchAdminUserDetail,
  fetchAdminUserPositions,
  fetchAdminUsers,
  purgeAdminComments,
  purgeAdminTradeHistory,
  updateAdminSeasonSchedule,
  updateAdminUserPosition,
  updateAdminUserWallet,
} from './api';
import type {
  AdminCommentCleanupRequest,
  AdminPositionUpdateRequest,
  AdminSeasonScheduleUpdateRequest,
  AdminTradeHistoryCleanupRequest,
  AdminWalletUpdateRequest,
} from './types';

export const adminQueryKeys = {
  all: (accessToken: string | null) => ['admin', accessToken] as const,
  dashboard: (accessToken: string | null) => ['admin', accessToken, 'dashboard'] as const,
  users: (accessToken: string | null, query: string | null) => ['admin', accessToken, 'users', query ?? ''] as const,
  userDetail: (accessToken: string | null, userId: number | null) => ['admin', accessToken, 'user', userId] as const,
  userPositions: (accessToken: string | null, userId: number | null, seasonId: number | null) =>
    ['admin', accessToken, 'userPositions', userId, seasonId] as const,
};

export function useAdminDashboard(accessToken: string | null, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken),
    queryKey: adminQueryKeys.dashboard(accessToken),
    queryFn: () => fetchAdminDashboard(accessToken as string),
    staleTime: 1000 * 30,
  });
}

export function useAdminUsers(accessToken: string | null, query: string | null, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken),
    queryKey: adminQueryKeys.users(accessToken, query),
    queryFn: () => fetchAdminUsers(accessToken as string, query),
    staleTime: 1000 * 10,
  });
}

export function useAdminUserDetail(accessToken: string | null, userId: number | null, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && typeof userId === 'number',
    queryKey: adminQueryKeys.userDetail(accessToken, userId),
    queryFn: () => fetchAdminUserDetail(accessToken as string, userId as number),
    staleTime: 1000 * 10,
  });
}

export function useAdminUserPositions(
  accessToken: string | null,
  userId: number | null,
  seasonId: number | null,
  enabled = true,
) {
  return useQuery({
    enabled: enabled && Boolean(accessToken) && typeof userId === 'number' && typeof seasonId === 'number',
    queryKey: adminQueryKeys.userPositions(accessToken, userId, seasonId),
    queryFn: () => fetchAdminUserPositions(accessToken as string, userId as number, seasonId as number),
    staleTime: 1000 * 10,
  });
}

export function useUpdateAdminUserWallet(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      request,
    }: {
      userId: number;
      request: AdminWalletUpdateRequest;
    }) => updateAdminUserWallet(accessToken as string, userId, request),
    onSuccess: async (data) => {
      queryClient.setQueryData(adminQueryKeys.userDetail(accessToken, data.id), data);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard(accessToken) }),
        queryClient.invalidateQueries({ queryKey: ['admin', accessToken, 'users'] }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.userDetail(accessToken, data.id) }),
      ]);
    },
  });
}

export function useUpdateAdminUserPosition(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      positionId,
      request,
    }: {
      userId: number;
      positionId: number;
      request: AdminPositionUpdateRequest;
    }) => updateAdminUserPosition(accessToken as string, userId, positionId, request),
    onSuccess: async (data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard(accessToken) }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.userDetail(accessToken, variables.userId) }),
        queryClient.invalidateQueries({
          queryKey: adminQueryKeys.userPositions(accessToken, variables.userId, data.seasonId),
        }),
        queryClient.invalidateQueries({ queryKey: ['admin', accessToken, 'userPositions', variables.userId] }),
      ]);
    },
  });
}

export function usePurgeAdminComments(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AdminCommentCleanupRequest) => purgeAdminComments(accessToken as string, request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard(accessToken) }),
        queryClient.invalidateQueries({ queryKey: ['admin', accessToken, 'user'] }),
      ]);
    },
  });
}

export function usePurgeAdminTradeHistory(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AdminTradeHistoryCleanupRequest) => purgeAdminTradeHistory(accessToken as string, request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard(accessToken) }),
        queryClient.invalidateQueries({ queryKey: ['admin', accessToken, 'user'] }),
      ]);
    },
  });
}

export function useUpdateAdminSeasonSchedule(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seasonId,
      request,
    }: {
      seasonId: number;
      request: AdminSeasonScheduleUpdateRequest;
    }) => updateAdminSeasonSchedule(accessToken as string, seasonId, request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard(accessToken) }),
        queryClient.invalidateQueries({ queryKey: ['admin', accessToken, 'user'] }),
      ]);
    },
  });
}

export function useCloseAdminSeason(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seasonId: number) => closeAdminSeason(accessToken as string, seasonId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard(accessToken) }),
        queryClient.invalidateQueries({ queryKey: ['admin', accessToken, 'user'] }),
      ]);
    },
  });
}

export function useDeleteAdminUser(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => deleteAdminUser(accessToken as string, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard(accessToken) });
      void queryClient.invalidateQueries({ queryKey: ['admin', accessToken, 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', accessToken, 'user'] });
    },
  });
}
