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
  currentPricePoints: number;
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
  currentPricePoints: number | null;
  profitPoints: number | null;
  chartOut: boolean;
  status: string;
  buyCapturedAt: string;
  createdAt: string;
  closedAt: string | null;
}

export interface GamePositionRankHistoryPoint {
  runId: number;
  capturedAt: string;
  rank: number | null;
  viewCount: number | null;
  chartOut: boolean;
  buyPoint: boolean;
  sellPoint: boolean;
}

export interface GamePositionRankHistory {
  positionId: number;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  status: string;
  buyRank: number;
  latestRank: number | null;
  sellRank: number | null;
  latestChartOut: boolean;
  buyCapturedAt: string;
  latestCapturedAt: string;
  closedAt: string | null;
  points: GamePositionRankHistoryPoint[];
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
  sellPricePoints: number;
  pnlPoints: number;
  settledPoints: number;
  balancePoints: number;
  closedAt: string;
}
