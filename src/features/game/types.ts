export interface GameWallet {
  seasonId: number;
  balancePoints: number;
  reservedPoints: number;
  realizedPnlPoints: number;
  totalAssetPoints: number;
}

export type GameStrategyType = 'ATLAS_SHOT' | 'MOONSHOT' | 'SMALL_CASHOUT' | 'BIG_CASHOUT' | 'SNIPE';
export type GameNotificationEventType = 'PROJECTED_HIGHLIGHT' | 'TIER_SCORE_GAIN' | 'TIER_PROMOTION' | 'TITLE_UNLOCK';
export type AchievementTitleGrade = 'NORMAL' | 'RARE' | 'SUPER' | 'ULTIMATE';
export type ScheduledSellOrderStatus = 'PENDING' | 'EXECUTED' | 'CANCELED' | 'FAILED';

export interface SelectedAchievementTitle {
  code: string;
  displayName: string;
  shortName: string;
  grade: AchievementTitleGrade;
  description: string;
}

export interface AchievementTitle extends SelectedAchievementTitle {
  earned: boolean;
  selected: boolean;
  earnedAt: string | null;
}

export interface AchievementTitleCollection {
  selectedTitle: SelectedAchievementTitle | null;
  titles: AchievementTitle[];
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
  notifications?: GameNotification[];
}

export interface GameNotification {
  id: string;
  notificationEventType?: GameNotificationEventType;
  notificationType: GameStrategyType | 'TIER_PROMOTION' | 'TITLE_UNLOCK';
  title: string;
  message: string;
  positionId: number | null;
  videoId: string | null;
  videoTitle: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  strategyTags: GameStrategyType[];
  highlightScore: number | null;
  titleCode?: string | null;
  titleDisplayName?: string | null;
  titleGrade?: AchievementTitleGrade | null;
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
  currentTier: GameTier;
  selectedAchievementTitle: SelectedAchievementTitle | null;
  highlightScore: number;
  highlightCount: number;
  topHighlightType: string | null;
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

export interface GameTier {
  tierCode: string;
  displayName: string;
  minScore: number;
  badgeCode: string;
  titleCode: string;
  profileThemeCode: string;
}

export interface GameTierProgress {
  seasonId: number;
  seasonName: string;
  regionCode: string;
  highlightScore: number;
  calculatedHighlightScore?: number;
  manualTierScoreAdjustment?: number;
  currentTier: GameTier;
  nextTier: GameTier | null;
  tiers: GameTier[];
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
  reservedForSell?: boolean;
  scheduledSellOrderId?: number | null;
  scheduledSellTargetRank?: number | null;
  scheduledSellQuantity?: number | null;
}

export interface GameScheduledSellOrder {
  id: number;
  userId: number;
  seasonId: number;
  positionId: number;
  videoId: string;
  videoTitle: string;
  channelTitle: string;
  thumbnailUrl: string;
  regionCode: string;
  targetRank: number;
  status: ScheduledSellOrderStatus;
  currentRank: number | null;
  buyRank: number;
  quantity: number;
  stakePoints: number;
  sellPricePoints?: number | null;
  settledPoints?: number | null;
  pnlPoints?: number | null;
  failureReason: string | null;
  triggeredAt: string | null;
  executedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface CreateScheduledSellOrderInput {
  positionId: number;
  regionCode: string;
  targetRank: number;
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
