import { fetchApi } from '../../lib/api';
import type {
  AdminCommentCleanupRequest,
  AdminCommentCleanupResponse,
  AdminDashboard,
  AdminPositionUpdateRequest,
  AdminSeasonScheduleUpdateRequest,
  AdminSeasonStartingBalanceUpdateRequest,
  AdminSeasonSummary,
  AdminTrendSnapshotHistory,
  AdminTradeHistoryCleanupRequest,
  AdminTradeHistoryCleanupResponse,
  AdminUserDetail,
  AdminUserList,
  AdminUserPosition,
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

export async function fetchAdminTrendSnapshots(
  accessToken: string,
  startAt: string,
  endAt: string,
  regionCode?: string | null,
) {
  const searchParams = new URLSearchParams({
    startAt,
    endAt,
  });

  if (regionCode?.trim()) {
    searchParams.set('regionCode', regionCode.trim().toUpperCase());
  }

  return fetchApi<AdminTrendSnapshotHistory>(`/api/admin/trend-snapshots?${searchParams.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function purgeAdminComments(
  accessToken: string,
  request: AdminCommentCleanupRequest,
) {
  return fetchApi<AdminCommentCleanupResponse>('/api/admin/comments/purge', {
    method: 'POST',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
}

export async function purgeAdminTradeHistory(
  accessToken: string,
  request: AdminTradeHistoryCleanupRequest,
) {
  return fetchApi<AdminTradeHistoryCleanupResponse>('/api/admin/trade-history/purge', {
    method: 'POST',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
}

export async function updateAdminSeasonSchedule(
  accessToken: string,
  seasonId: number,
  request: AdminSeasonScheduleUpdateRequest,
) {
  return fetchApi<AdminSeasonSummary>(`/api/admin/seasons/${seasonId}`, {
    method: 'PATCH',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
}

export async function updateAdminSeasonStartingBalance(
  accessToken: string,
  seasonId: number,
  request: AdminSeasonStartingBalanceUpdateRequest,
) {
  return fetchApi<AdminSeasonSummary>(`/api/admin/seasons/${seasonId}/starting-balance`, {
    method: 'PATCH',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
}

export async function closeAdminSeason(accessToken: string, seasonId: number) {
  return fetchApi<void>(`/api/admin/seasons/${seasonId}/close`, {
    method: 'POST',
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

export async function fetchAdminUserPositions(accessToken: string, userId: number, seasonId: number) {
  const params = new URLSearchParams({ seasonId: String(seasonId) });

  return fetchApi<AdminUserPosition[]>(`/api/admin/users/${userId}/positions?${params.toString()}`, {
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

export async function updateAdminUserPosition(
  accessToken: string,
  userId: number,
  positionId: number,
  request: AdminPositionUpdateRequest,
) {
  return fetchApi<AdminUserPosition>(`/api/admin/users/${userId}/positions/${positionId}`, {
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
