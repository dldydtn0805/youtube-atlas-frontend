import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAdminUser,
  fetchAdminDashboard,
  fetchAdminUserDetail,
  fetchAdminUsers,
  updateAdminUserWallet,
} from './api';
import type { AdminWalletUpdateRequest } from './types';

export const adminQueryKeys = {
  all: (accessToken: string | null) => ['admin', accessToken] as const,
  dashboard: (accessToken: string | null) => ['admin', accessToken, 'dashboard'] as const,
  users: (accessToken: string | null, query: string | null) => ['admin', accessToken, 'users', query ?? ''] as const,
  userDetail: (accessToken: string | null, userId: number | null) => ['admin', accessToken, 'user', userId] as const,
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
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard(accessToken) });
      void queryClient.invalidateQueries({ queryKey: ['admin', accessToken, 'users'] });
      queryClient.setQueryData(adminQueryKeys.userDetail(accessToken, data.id), data);
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
