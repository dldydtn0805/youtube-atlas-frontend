import { fetchApi } from '../../lib/api';
import type {
  AdminCommentCleanupRequest,
  AdminCommentCleanupResponse,
  AdminDashboard,
  AdminHighlightHistoryCleanupRequest,
  AdminHighlightHistoryCleanupResponse,
  AdminPositionUpdateRequest,
  AdminPriceAnchorList,
  AdminPriceAnchorUpdateRequest,
  AdminSeasonScheduleUpdateRequest,
  AdminSeasonStartingBalanceUpdateRequest,
  AdminSeasonSummary,
  AdminTierThresholdList,
  AdminTierThresholdUpdateRequest,
  AdminTrendSnapshotHistory,
  AdminTradeHistoryCleanupRequest,
  AdminTradeHistoryCleanupResponse,
  AdminTierSummary,
  AdminUserDetail,
  AdminUserGameSummary,
  AdminUserHighlightSummary,
  AdminUserList,
  AdminUserPosition,
  AdminWalletUpdateRequest,
} from './types';

type ApiAdminTierSummary = Omit<AdminTierSummary, 'minScore'> & {
  minScore?: number | null;
};

type ApiAdminUserGameSummary = Omit<AdminUserGameSummary, 'currentTier' | 'nextTier'> & {
  currentCoinTier?: ApiAdminTierSummary | null;
  nextCoinTier?: ApiAdminTierSummary | null;
  currentTier?: ApiAdminTierSummary | null;
  nextTier?: ApiAdminTierSummary | null;
};

type ApiAdminUserDetail = Omit<AdminUserDetail, 'activeSeasonGame' | 'activeSeasonGames'> & {
  activeSeasonGame?: ApiAdminUserGameSummary | null;
  activeSeasonGames?: ApiAdminUserGameSummary[];
};

type ApiAdminTradeHistoryCleanupResponse = Omit<AdminTradeHistoryCleanupResponse, 'deletedScheduledSellOrderCount'> & {
  deletedScheduledSellOrderCount?: number | null;
};

function createAuthorizationHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

function normalizeNullableNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeAdminTierSummary(tier: ApiAdminTierSummary | null | undefined): AdminTierSummary | null {
  if (!tier) {
    return null;
  }

  return {
    ...tier,
    minScore: typeof tier.minScore === 'number' && Number.isFinite(tier.minScore) ? tier.minScore : 0,
  };
}

function normalizeAdminUserGameSummary(
  gameSummary: ApiAdminUserGameSummary | null | undefined,
): AdminUserGameSummary | null {
  if (!gameSummary) {
    return null;
  }

  return {
    ...gameSummary,
    currentTier: normalizeAdminTierSummary(gameSummary.currentCoinTier ?? gameSummary.currentTier),
    nextTier: normalizeAdminTierSummary(gameSummary.nextCoinTier ?? gameSummary.nextTier),
  };
}

function normalizeAdminUserDetail(userDetail: ApiAdminUserDetail): AdminUserDetail {
  return {
    ...userDetail,
    activeSeasonGame: normalizeAdminUserGameSummary(userDetail.activeSeasonGame),
    activeSeasonGames: Array.isArray(userDetail.activeSeasonGames)
      ? userDetail.activeSeasonGames
          .map((gameSummary) => normalizeAdminUserGameSummary(gameSummary))
          .filter((gameSummary): gameSummary is AdminUserGameSummary => gameSummary !== null)
      : undefined,
  };
}

export async function fetchAdminDashboard(accessToken: string) {
  return fetchApi<AdminDashboard>('/api/admin/dashboard', {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchAdminPriceAnchors(accessToken: string) {
  return fetchApi<AdminPriceAnchorList>('/api/admin/game/price-anchors', {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function updateAdminPriceAnchors(
  accessToken: string,
  request: AdminPriceAnchorUpdateRequest,
) {
  return fetchApi<AdminPriceAnchorList>('/api/admin/game/price-anchors', {
    method: 'PUT',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
}

export async function fetchAdminTierThresholds(accessToken: string) {
  return fetchApi<AdminTierThresholdList>('/api/admin/game/tiers', {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function updateAdminTierThresholds(
  accessToken: string,
  request: AdminTierThresholdUpdateRequest,
) {
  return fetchApi<AdminTierThresholdList>('/api/admin/game/tiers', {
    method: 'PUT',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
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

export async function purgeAdminHighlightHistory(
  accessToken: string,
  request: AdminHighlightHistoryCleanupRequest,
) {
  return fetchApi<AdminHighlightHistoryCleanupResponse>('/api/admin/highlights/purge', {
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
  const response = await fetchApi<ApiAdminTradeHistoryCleanupResponse>('/api/admin/trade-history/purge', {
    method: 'POST',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  return {
    ...response,
    deletedScheduledSellOrderCount: normalizeNullableNumber(response.deletedScheduledSellOrderCount),
  };
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
  const userDetail = await fetchApi<ApiAdminUserDetail>(`/api/admin/users/${userId}`, {
    headers: createAuthorizationHeader(accessToken),
  });

  return normalizeAdminUserDetail(userDetail);
}

export async function fetchAdminUserHighlights(accessToken: string, userId: number, seasonId: number) {
  const params = new URLSearchParams({ seasonId: String(seasonId) });

  return fetchApi<AdminUserHighlightSummary>(`/api/admin/users/${userId}/highlights?${params.toString()}`, {
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
  const userDetail = await fetchApi<ApiAdminUserDetail>(`/api/admin/users/${userId}/wallet`, {
    method: 'PATCH',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  return normalizeAdminUserDetail(userDetail);
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
