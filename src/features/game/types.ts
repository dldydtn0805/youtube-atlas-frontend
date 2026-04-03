export interface GameWallet {
  seasonId: number;
  balancePoints: number;
  reservedPoints: number;
  realizedPnlPoints: number;
  totalAssetPoints: number;
}

export interface GameCurrentSeason {
  seasonId: number;
  seasonName: string;
  status: string;
  regionCode: string;
  startAt: string;
  endAt: string;
  startingBalancePoints: number;
  minHoldSeconds: number;
  maxOpenPositions: number;
  rankPointMultiplier: number;
  wallet: GameWallet;
}

export interface GameMarketVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  currentRank: number;
  previousRank: number | null;
  rankChange: number | null;
  currentViewCount: number | null;
  viewCountDelta: number | null;
  isNew: boolean;
  canBuy: boolean;
  buyBlockedReason: string | null;
  capturedAt: string;
}

export interface GameLeaderboardEntry {
  rank: number;
  userId: number;
  displayName: string;
  pictureUrl: string | null;
  totalAssetPoints: number;
  balancePoints: number;
  reservedPoints: number;
  realizedPnlPoints: number;
  unrealizedPnlPoints: number;
  openPositionCount: number;
  me: boolean;
}

export interface GamePosition {
  id: number;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  buyRank: number;
  currentRank: number | null;
  rankDiff: number | null;
  stakePoints: number;
  profitPoints: number | null;
  chartOut: boolean;
  status: string;
  buyCapturedAt: string;
  createdAt: string;
  closedAt: string | null;
}

export interface CreateGamePositionInput {
  regionCode: string;
  categoryId: string;
  videoId: string;
  stakePoints: number;
}

export interface SellGamePositionResponse {
  positionId: number;
  videoId: string;
  buyRank: number;
  sellRank: number;
  rankDiff: number;
  stakePoints: number;
  pnlPoints: number;
  settledPoints: number;
  balancePoints: number;
  closedAt: string;
}
