export interface GameWallet {
  seasonId: number;
  balancePoints: number;
  reservedPoints: number;
  realizedPnlPoints: number;
  coinBalance: number;
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
  currentTier: GameCoinTier;
  coinBalance: number;
  totalAssetPoints: number;
  balancePoints: number;
  reservedPoints: number;
  totalStakePoints: number;
  totalEvaluationPoints: number;
  profitRatePercent: number | null;
  realizedPnlPoints: number;
  unrealizedPnlPoints: number;
  openPositionCount: number;
  me: boolean;
}

export interface GameCoinRank {
  rank: number;
  coinRatePercent: number;
}

export interface GameCoinTier {
  tierCode: string;
  displayName: string;
  minCoinBalance: number;
  badgeCode: string;
  titleCode: string;
  profileThemeCode: string;
}

export interface GameCoinTierProgress {
  seasonId: number;
  seasonName: string;
  regionCode: string;
  coinBalance: number;
  currentTier: GameCoinTier;
  nextTier: GameCoinTier | null;
  tiers: GameCoinTier[];
}

export interface GameSeasonCoinResult {
  seasonId: number;
  seasonName: string;
  regionCode: string;
  finalCoinBalance: number;
  finalTier: GameCoinTier;
  finalizedAt: string;
}

export interface GameCoinPosition {
  positionId: number;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  currentRank: number | null;
  quantity: number;
  currentValuePoints: number | null;
  rankEligible: boolean;
  productionActive: boolean;
  coinRatePercent: number;
  holdBoostPercent: number;
  effectiveCoinRatePercent: number;
  estimatedCoinYield: number;
  nextProductionInSeconds: number | null;
  nextPayoutInSeconds: number | null;
}

export interface GameCoinOverview {
  eligibleRankCutoff: number;
  minimumHoldSeconds: number;
  myCoinBalance: number;
  myEstimatedCoinYield: number;
  myActiveProducerCount: number;
  myWarmingUpPositionCount: number;
  ranks: GameCoinRank[];
  positions: GameCoinPosition[];
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
  quantity: number;
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
  quantity: number;
}

export interface SellGamePositionsInput {
  regionCode: string;
  positionId?: number;
  videoId?: string;
  quantity: number;
}

export interface SellGamePositionResponse {
  positionId: number;
  videoId: string;
  buyRank: number;
  sellRank: number;
  rankDiff: number;
  quantity: number;
  stakePoints: number;
  sellPricePoints: number;
  pnlPoints: number;
  settledPoints: number;
  balancePoints: number;
  closedAt: string;
}
