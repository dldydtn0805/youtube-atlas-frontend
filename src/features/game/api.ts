import { fetchApi } from '../../lib/api';
import type {
  AchievementTitleCollection,
  CreateScheduledSellOrderInput,
  CreateGamePositionInput,
  GameCurrentSeason,
  GameHighlight,
  GameLeaderboardEntry,
  GameMarketVideo,
  GameNotification,
  GamePosition,
  GamePositionRankHistory,
  GameScheduledSellOrder,
  GameTier,
  GameTierProgress,
  SellGamePreviewResponse,
  SellGamePositionsInput,
  SellGamePositionResponse,
} from './types';
import type { YouTubeCategorySection } from '../youtube/types';

type ApiGameTier = Omit<GameTier, 'minScore'> & {
  minScore?: number | null;
};

type ApiGameTierProgress = Omit<GameTierProgress, 'currentTier' | 'nextTier' | 'tiers'> & {
  currentTier: ApiGameTier;
  nextTier: ApiGameTier | null;
  tiers: ApiGameTier[];
};

type ApiGameLeaderboardEntry = Omit<GameLeaderboardEntry, 'currentTier'> & {
  currentTier: ApiGameTier;
  selectedAchievementTitle?: GameLeaderboardEntry['selectedAchievementTitle'];
};

type ApiGameCurrentSeason = Omit<GameCurrentSeason, 'wallet'> & {
  wallet: GameCurrentSeason['wallet'];
};

type ApiGameScheduledSellOrder = Omit<GameScheduledSellOrder, 'failureReason'> & {
  failedReason?: string | null;
  failureReason?: string | null;
};

function createAuthorizationHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

function normalizeGameTier(tier: ApiGameTier): GameTier {
  return {
    ...tier,
    minScore: typeof tier.minScore === 'number' && Number.isFinite(tier.minScore) ? tier.minScore : 0,
  };
}

function normalizeGameTierProgress(progress: ApiGameTierProgress): GameTierProgress {
  return {
    ...progress,
    currentTier: normalizeGameTier(progress.currentTier),
    nextTier: progress.nextTier ? normalizeGameTier(progress.nextTier) : null,
    tiers: progress.tiers.map(normalizeGameTier),
  };
}

function normalizeGameCurrentSeason(season: ApiGameCurrentSeason): GameCurrentSeason {
  return season;
}

function normalizeGameLeaderboardEntry(entry: ApiGameLeaderboardEntry): GameLeaderboardEntry {
  return {
    ...entry,
    currentTier: normalizeGameTier(entry.currentTier),
    selectedAchievementTitle: entry.selectedAchievementTitle ?? null,
  };
}

function normalizeAchievementTitleCollection(collection: AchievementTitleCollection): AchievementTitleCollection {
  return {
    selectedTitle: collection.selectedTitle ?? null,
    titles: Array.isArray(collection.titles) ? collection.titles : [],
  };
}

function normalizeGameScheduledSellOrder(order: ApiGameScheduledSellOrder): GameScheduledSellOrder {
  return {
    ...order,
    failureReason: order.failureReason ?? order.failedReason ?? null,
  };
}

export async function fetchCurrentGameSeason(accessToken: string, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  const season = await fetchApi<ApiGameCurrentSeason>(`/api/game/seasons/current?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });

  return normalizeGameCurrentSeason(season);
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

  const leaderboard = await fetchApi<ApiGameLeaderboardEntry[]>(`/api/game/leaderboard?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });

  return leaderboard.map(normalizeGameLeaderboardEntry);
}

export async function fetchAchievementTitles(accessToken: string) {
  const collection = await fetchApi<AchievementTitleCollection>('/api/game/achievement-titles/me', {
    headers: createAuthorizationHeader(accessToken),
  });

  return normalizeAchievementTitleCollection(collection);
}

export async function updateSelectedAchievementTitle(accessToken: string, titleCode: string | null) {
  const collection = await fetchApi<AchievementTitleCollection>('/api/game/achievement-titles/me/selected', {
    method: 'PATCH',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ titleCode }),
  });

  return normalizeAchievementTitleCollection(collection);
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

export async function fetchGameTierProgress(accessToken: string, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  const progress = await fetchApi<ApiGameTierProgress>(`/api/game/tiers/current?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });

  return normalizeGameTierProgress(progress);
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

export async function fetchScheduledSellOrders(accessToken: string, regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  const orders = await fetchApi<ApiGameScheduledSellOrder[]>(`/api/game/scheduled-sell-orders?${params.toString()}`, {
    headers: createAuthorizationHeader(accessToken),
  });

  return orders.map(normalizeGameScheduledSellOrder);
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

export async function createScheduledSellOrder(accessToken: string, input: CreateScheduledSellOrderInput) {
  const order = await fetchApi<ApiGameScheduledSellOrder>('/api/game/scheduled-sell-orders', {
    method: 'POST',
    headers: {
      ...createAuthorizationHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return normalizeGameScheduledSellOrder(order);
}

export async function cancelScheduledSellOrder(accessToken: string, orderId: number) {
  const order = await fetchApi<ApiGameScheduledSellOrder>(`/api/game/scheduled-sell-orders/${orderId}`, {
    method: 'DELETE',
    headers: createAuthorizationHeader(accessToken),
  });

  return normalizeGameScheduledSellOrder(order);
}
