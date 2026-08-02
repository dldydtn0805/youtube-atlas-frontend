export interface GameWallet {
  seasonId: number;
  balancePoints: number;
  reservedPoints: number;
  realizedPnlPoints: number;
  totalAssetPoints: number;
}

export type GameStrategyType =
  | 'ATLAS_SHOT'
  | 'GALAXY_SHOT'
  | 'SOLAR_SHOT'
  | 'MOONSHOT'
  | 'SMALL_CASHOUT'
  | 'BIG_CASHOUT'
  | 'SNIPE';
export type GameNotificationEventType = 'PROJECTED_HIGHLIGHT' | 'TIER_SCORE_GAIN' | 'TIER_PROMOTION' | 'TITLE_UNLOCK';
export type AchievementTitleGrade = 'NORMAL' | 'RARE' | 'SUPER' | 'ULTIMATE';
export type ScheduledSellOrderStatus = 'PENDING' | 'EXECUTED' | 'CANCELED' | 'FAILED';
export type ScheduledSellTriggerDirection = 'RANK_IMPROVES_TO' | 'RANK_DROPS_TO';
export type ScheduledSellTriggerType = 'RANK' | 'PROFIT_RATE';

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
  scheduledSellDefaultProfitRatePercent: number;
  scheduledSellProfitRatePresets: number[];
  minHoldSeconds: number;
  maxOpenPositions: number;
  rankPointMultiplier: number;
  inventorySlots: GameInventorySlots;
  wallet: GameWallet;
  notifications?: GameNotification[];
}

export interface GameSeasonResult {
  id: number;
  seasonId: number;
  seasonName: string;
  regionCode: string;
  seasonStartAt: string;
  seasonEndAt: string;
  finalRank: number;
  finalAssetPoints: number;
  finalBalancePoints: number;
  realizedPnlPoints: number;
  startingBalancePoints: number;
  profitRatePercent: number | null;
  finalHighlightScore: number;
  finalTierCode: string | null;
  finalTierName: string | null;
  finalTierBadgeCode: string | null;
  finalTierTitleCode: string | null;
  positionCount: number;
  bestPositionId: number | null;
  bestPositionVideoId: string | null;
  bestPositionTitle: string | null;
  bestPositionChannelTitle: string | null;
  bestPositionThumbnailUrl: string | null;
  bestPositionProfitPoints: number | null;
  bestPositionProfitRatePercent: number | null;
  bestPositionRankDiff: number | null;
  bestPositionBuyRank: number | null;
  bestPositionSellRank: number | null;
  titleCode: string | null;
  createdAt: string;
  highlights?: GameSeasonResultHighlights | null;
}

export interface GameSeasonResultHighlights {
  topRankRiser: GameSeasonResultHighlightItem | null;
  mostTaggedPositions: GameSeasonResultHighlightItem[];
  longestHeld: GameSeasonResultHighlightItem | null;
  highestTierScore: GameSeasonResultHighlightItem | null;
}

export interface GameSeasonResultHighlightItem {
  positionId: number;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  buyRank: number | null;
  sellRank: number | null;
  rankDiff: number | null;
  profitPoints: number | null;
  profitRatePercent: number | null;
  holdDurationSeconds: number | null;
  tagCount: number | null;
  highlightScore: number | null;
  strategyTags: GameStrategyType[];
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
  demandPriceDeltaPoints?: number;
  demandPriceDeltaPercent?: number;
  demandPriceType?: 'PREMIUM' | 'DISCOUNT' | 'NONE';
  currentViewCount: number | null;
  viewCountDelta: number | null;
  isNew: boolean;
  canBuy: boolean;
  buyBlockedReason: string | null;
  capturedAt: string;
  syncBuyCount?: number;
  syncBuyQuantity?: number;
  syncSellCount?: number;
  syncSellQuantity?: number;
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
  inventorySlots: number;
}

export interface GameInventorySlots {
  baseSlots: number;
  totalSlots: number;
  maxSlots: number;
  currentTier: GameTier | null;
  nextTier: GameTier | null;
  tiers: GameTier[];
}

export interface GameTierProgress {
  seasonId: number;
  seasonName: string;
  regionCode: string;
  totalAssetPoints: number;
  tierBasis?: 'TOTAL_ASSET_POINTS';
  highlightScore?: number;
  calculatedHighlightScore?: number;
  manualTierScoreAdjustment?: number;
  currentTier: GameTier;
  nextTier: GameTier | null;
  tiers: GameTier[];
}

export interface GameHighlightStrategyScore {
  strategyType: GameStrategyType;
  baseScore: number;
  rankDiff: number | null;
  rankDiffMultiplier: number;
  rankDiffBonus: number;
  profitRatePercent: number | null;
  profitRateMultiplier: number;
  maxProfitRateBonus: number;
  profitRateBonus: number;
  profitPoints: number | null;
  minProfitPointsForBonus: number;
  maxProfitPointsBonus: number;
  profitPointsBonus: number;
  totalScore: number;
}

export interface GameHighlightScoreBreakdown {
  totalScore: number;
  strategyScores: GameHighlightStrategyScore[];
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
  scoreBreakdown?: GameHighlightScoreBreakdown | null;
  status: string;
  createdAt: string;
}

export interface GamePosition {
  id: number;
  regionCode?: string;
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
  scheduledSellTriggerType?: ScheduledSellTriggerType | null;
  scheduledSellTargetRank?: number | null;
  scheduledSellTargetProfitRatePercent?: number | null;
  scheduledSellTriggerDirection?: ScheduledSellTriggerDirection | null;
  scheduledSellQuantity?: number | null;
  sellLockedUntilNextSync?: boolean;
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
  triggerType?: ScheduledSellTriggerType | null;
  targetRank: number | null;
  targetProfitRatePercent?: number | null;
  triggerDirection: ScheduledSellTriggerDirection;
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
  triggerType: ScheduledSellTriggerType;
  targetRank?: number | null;
  targetProfitRatePercent?: number | null;
  quantity: number;
  triggerDirection?: ScheduledSellTriggerDirection;
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

export interface GameAccountState {
  currentSeason?: GameCurrentSeason;
  openPositions: GamePosition[];
  positionHistory: GamePosition[];
  tierProgress: GameTierProgress;
  updatedAt: string;
  wallet: GameWallet;
}

export interface BuyGamePositionResponse {
  positionId: number;
  state: GameAccountState;
}

export interface SellGamePositionsResponse {
  sales: SellGamePositionResponse[];
  state: GameAccountState;
}

export interface SellSingleGamePositionResponse {
  sale: SellGamePositionResponse;
  state: GameAccountState;
}

export interface GameRealtimeEvent {
  eventType: string;
  regionCode: string;
  seasonId: number | null;
  capturedAt: string | null;
  occurredAt: string | null;
  resource?: 'market' | 'positions' | 'scheduled-orders' | 'wallet';
  wallet?: Partial<GameWallet>;
}
