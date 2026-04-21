import { fetchApi } from '../../lib/api';
import type {
  CreateGamePositionInput,
  GameCoinOverview,
  GameCoinTierProgress,
  GameCurrentSeason,
  GameHighlight,
  GameLeaderboardEntry,
  GameMarketVideo,
  GameNotification,
  GamePosition,
  GamePositionRankHistory,
  GameSeasonCoinResult,
  SellGamePreviewResponse,
  SellGamePositionsInput,
  SellGamePositionResponse,
} from './types';
import type { YouTubeCategorySection } from '../youtube/types';

function createAuthorizationHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function fetchCurrentGameSeason(accessToken: string, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<GameCurrentSeason>(`/api/game/seasons/current?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchGameMarket(accessToken: string, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<GameMarketVideo[]>(`/api/game/market?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchBuyableMarketChart(accessToken: string, regionCode: string, pageToken?: string) {
  const params = new URLSearchParams({ regionCode });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  return fetchApi<YouTubeCategorySection>(`/api/game/market/buyable-chart?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchGameLeaderboard(accessToken: string, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<GameLeaderboardEntry[]>(`/api/game/leaderboard?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchGameCoinOverview(accessToken: string, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<GameCoinOverview>(`/api/game/coins/overview?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchGameHighlights(accessToken: string, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<GameHighlight[]>(`/api/game/highlights?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchGameNotifications(accessToken: string, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<GameNotification[]>(`/api/game/notifications?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function markGameNotificationsRead(accessToken: string, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<void>(`/api/game/notifications/read?${params.toString()}`, {
    method: 'PATCH',
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function deleteGameNotifications(accessToken: string, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<void>(`/api/game/notifications?${params.toString()}`, {
    method: 'DELETE',
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function deleteGameNotification(accessToken: string, notificationId: string) {
  return fetchApi<void>(`/api/game/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchGameCoinTierProgress(accessToken: string, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<GameCoinTierProgress>(`/api/game/tiers/current?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchMySeasonCoinResult(accessToken: string, seasonId: number) {
  return fetchApi<GameSeasonCoinResult>(`/api/game/seasons/${seasonId}/results/me`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchGameLeaderboardPositions(accessToken: string, userId: number, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<GamePosition[]>(`/api/game/leaderboard/${userId}/positions?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchGameLeaderboardHighlights(accessToken: string, userId: number, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<GameHighlight[]>(`/api/game/leaderboard/${userId}/highlights?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchMyGamePositions(accessToken: string, regionCode: string, status = 'OPEN', limit?: number) {
  const params = new URLSearchParams({ regionCode });

  if (status.trim()) {
    params.set('status', status);
  }

  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    params.set('limit', String(Math.floor(limit)));
  }

  const queryString = params.toString();

  return fetchApi<GamePosition[]>(
    queryString ? `/api/game/positions/me?${queryString}` : '/api/game/positions/me',
    {
      headers: createAuthorizationHeader(accessToken),
    },
  );
}

export async function fetchGamePositionRankHistory(accessToken: string, positionId: number) {
  return fetchApi<GamePositionRankHistory>(`/api/game/positions/${positionId}/rank-history`, {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function fetchGameLeaderboardPositionRankHistory(
  accessToken: string,
  userId: number,
  positionId: number,
  regionCode: string,
) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<GamePositionRankHistory>(
    `/api/game/leaderboard/${userId}/positions/${positionId}/rank-history?${params.toString()}`,
    {
      headers: createAuthorizationHeader(accessToken),
    },
  );
}

export async function buyGamePosition(accessToken: string, input: CreateGamePositionInput) {
  return fetchApi<GamePosition[]>('/api/game/positions', {
    method: 'POST',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export async function sellGamePosition(accessToken: string, positionId: number) {
  return fetchApi<SellGamePositionResponse>(`/api/game/positions/${positionId}/sell`, {
    method: 'POST',
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function sellGamePositions(accessToken: string, input: SellGamePositionsInput) {
  return fetchApi<SellGamePositionResponse[]>('/api/game/positions/sell', {
    method: 'POST',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export async function fetchSellGamePreview(accessToken: string, input: SellGamePositionsInput) {
  return fetchApi<SellGamePreviewResponse>('/api/game/positions/sell-preview', {
    method: 'POST',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}
