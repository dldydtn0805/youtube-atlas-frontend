import { fetchApi } from '../../lib/api';
import type {
  AdminDashboard,
  AdminUserDetail,
  AdminUserList,
  AdminWalletUpdateRequest,
} from './types';

function createAuthorizationHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function fetchAdminDashboard(accessToken: string) {
  return fetchApi<AdminDashboard>('/api/admin/dashboard', {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchAdminUsers(accessToken: string, query?: string | null, limit = 40) {
  const searchParams = new URLSearchParams();
  searchParams.set('limit', String(limit));

  if (query?.trim()) {
    searchParams.set('q', query.trim());
  }

  return fetchApi<AdminUserList>(`/api/admin/users?${searchParams.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchAdminUserDetail(accessToken: string, userId: number) {
  return fetchApi<AdminUserDetail>(`/api/admin/users/${userId}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function updateAdminUserWallet(
  accessToken: string,
  userId: number,
  request: AdminWalletUpdateRequest,
) {
  return fetchApi<AdminUserDetail>(`/api/admin/users/${userId}/wallet`, {
    method: 'PATCH',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
}

export async function deleteAdminUser(accessToken: string, userId: number) {
  return fetchApi<void>(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: createAuthorizationHeader(accessToken),
  });
}
