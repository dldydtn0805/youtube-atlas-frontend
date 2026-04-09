import { fetchApi } from '../../lib/api';
import type {
  CreateGamePositionInput,
  GameCoinOverview,
  GameCoinTierProgress,
  GameCurrentSeason,
  GameLeaderboardEntry,
  GameMarketVideo,
  GamePosition,
  GamePositionRankHistory,
  GameSeasonCoinResult,
  SellGamePositionsInput,
  SellGamePositionResponse,
} from './types';

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
