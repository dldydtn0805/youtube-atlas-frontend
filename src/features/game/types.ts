export interface GameWallet {
  seasonId: number;
  balancePoints: number;
  reservedPoints: number;
  realizedPnlPoints: number;
  coinBalance: number;
  totalAssetPoints: number;
}

export type GameStrategyType = 'MOONSHOT' | 'SMALL_CASHOUT' | 'BIG_CASHOUT' | 'SNIPE';

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
  notifications?: GameNotification[];
}

export interface GameNotification {
  id: string;
  notificationType: GameStrategyType | 'TIER_PROMOTION';
  title: string;
  message: string;
  positionId: number;
  videoId: string;
  videoTitle: string;
  channelTitle: string;
  thumbnailUrl: string;
  strategyTags: GameStrategyType[];
  highlightScore: number | null;
  readAt: string | null;
  createdAt: string;
  showModal?: boolean;
}

export interface GameMarketVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  currentRank: number;
  previousRank: number | null;
  rankChange: number | null;
  basePricePoints?: number;
  currentPricePoints: number;
  momentumPriceDeltaPoints?: number;
  momentumPriceDeltaPercent?: number;
  momentumPriceType?: 'PREMIUM' | 'DISCOUNT' | 'NONE';
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
  highlightScore: number;
  highlightCount: number;
  topHighlightType: string | null;
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
  highlightScore: number;
  calculatedHighlightScore?: number;
  manualTierScoreAdjustment?: number;
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

export interface GameHighlight {
  id: string;
  highlightType: string;
  title: string;
  description: string;
  positionId: number;
  videoId: string;
  videoTitle: string;
  channelTitle: string;
  thumbnailUrl: string;
  buyRank: number;
  highlightRank: number | null;
  sellRank: number | null;
  rankDiff: number | null;
  quantity: number;
  stakePoints: number;
  currentPricePoints: number | null;
  profitPoints: number | null;
  profitRatePercent: number | null;
  strategyTags?: GameStrategyType[];
  highlightScore: number;
  status: string;
  createdAt: string;
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
  strategyTags?: GameStrategyType[];
  achievedStrategyTags?: GameStrategyType[];
  targetStrategyTags?: GameStrategyType[];
  projectedHighlightScore?: number;
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

export interface SellGamePreviewItem {
  positionId: number;
  buyRank: number;
  quantity: number;
  stakePoints: number;
  sellPricePoints: number;
  pnlPoints: number;
  settledPoints: number;
  projectedHighlightScore: number;
  bestHighlightScore: number;
  appliedHighlightScoreDelta: number;
  willUpdateRecord: boolean;
}

export interface SellGamePreviewResponse {
  quantity: number;
  sellRank: number;
  stakePoints: number;
  sellPricePoints: number;
  pnlPoints: number;
  settledPoints: number;
  projectedHighlightScore: number;
  appliedHighlightScoreDelta: number;
  recordEligibleCount: number;
  items: SellGamePreviewItem[];
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
  highlightScore: number;
  balancePoints: number;
  soldAt: string;
}

export interface GameRealtimeEvent {
  eventType: string;
  regionCode: string;
  seasonId: number | null;
  capturedAt: string | null;
  occurredAt: string | null;
}
