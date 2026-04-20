export interface AdminSummaryMetrics {
  totalUsers: number;
  totalComments: number;
  totalFavorites: number;
  totalTrendRuns: number;
  totalTradeHistories: number;
}

export interface AdminSeasonSummary {
  id: number;
  name: string;
  status: string;
  regionCode: string;
  startingBalancePoints: number;
  startAt: string;
  endAt: string;
  createdAt: string;
}

export interface AdminTrendSnapshot {
  rank: number;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  viewCount: number | null;
}

export interface AdminTrendRunSummary {
  id: number;
  regionCode: string;
  categoryId: string;
  categoryLabel: string;
  source: string;
  capturedAt: string;
  topVideos: AdminTrendSnapshot[];
}

export interface AdminUserSummary {
  id: number;
  email: string;
  displayName: string;
  pictureUrl: string | null;
  admin: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface AdminCommentSummary {
  id: number;
  videoId: string;
  author: string;
  content: string;
  clientId: string;
  createdAt: string;
}

export interface AdminFavoriteSummary {
  id: number;
  userId: number;
  userEmail: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface AdminDashboard {
  metrics: AdminSummaryMetrics;
  activeSeason: AdminSeasonSummary | null;
  activeSeasons?: AdminSeasonSummary[];
  latestTrendRun: AdminTrendRunSummary | null;
  recentUsers: AdminUserSummary[];
  recentComments: AdminCommentSummary[];
  recentFavorites: AdminFavoriteSummary[];
}

export interface AdminTrendSnapshotHistoryItem {
  id: number;
  runId: number;
  regionCode: string;
  categoryId: string;
  categoryLabel: string;
  source: string;
  capturedAt: string;
  savedAt: string;
  rank: number;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  viewCount: number | null;
  videoCategoryId: string | null;
  videoCategoryLabel: string | null;
}

export interface AdminTrendSnapshotHistory {
  startAt: string;
  endAt: string;
  count: number;
  items: AdminTrendSnapshotHistoryItem[];
}

export interface AdminSeasonScheduleUpdateRequest {
  startAt: string;
  endAt: string;
}

export interface AdminSeasonStartingBalanceUpdateRequest {
  startingBalancePoints: number;
}

export interface AdminCommentCleanupRequest {
  deleteBefore: string;
}

export interface AdminCommentCleanupResponse {
  deleteBefore: string;
  deletedAt: string;
  deletedCount: number;
}

export interface AdminTradeHistoryCleanupRequest {
  deleteBefore: string;
}

export interface AdminTradeHistoryCleanupResponse {
  deleteBefore: string;
  deletedAt: string;
  deletedPositionCount: number;
  deletedLedgerCount: number;
  deletedCoinPayoutCount: number;
  deletedDividendPayoutCount: number;
}

export interface AdminPlaybackProgress {
  videoId: string;
  videoTitle: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  positionSeconds: number;
  updatedAt: string;
}

export interface AdminCoinTierSummary {
  tierCode: string;
  displayName: string;
  minCoinBalance: number;
  badgeCode: string;
  titleCode: string;
  profileThemeCode: string;
}

export interface AdminUserGameSummary {
  seasonId: number;
  seasonName: string;
  regionCode: string;
  participating: boolean;
  balancePoints: number | null;
  reservedPoints: number | null;
  realizedPnlPoints: number | null;
  tierScore: number | null;
  coinBalance: number | null;
  totalAssetPoints: number | null;
  currentCoinTier: AdminCoinTierSummary | null;
  nextCoinTier: AdminCoinTierSummary | null;
  openPositionCount: number;
  closedPositionCount: number;
}

export interface AdminUserPosition {
  id: number;
  seasonId: number;
  seasonName: string;
  regionCode: string;
  categoryId: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  buyRank: number;
  quantity: number;
  stakePoints: number;
  status: string;
  buyCapturedAt: string;
  createdAt: string;
  closedAt: string | null;
}

export interface AdminUserDetail {
  id: number;
  email: string;
  displayName: string;
  pictureUrl: string | null;
  admin: boolean;
  createdAt: string;
  lastLoginAt: string;
  favoriteCount: number;
  lastPlaybackProgress: AdminPlaybackProgress | null;
  activeSeasonGame: AdminUserGameSummary | null;
  activeSeasonGames?: AdminUserGameSummary[];
}

export interface AdminUserList {
  query: string | null;
  limit: number;
  count: number;
  users: AdminUserSummary[];
}

export interface AdminWalletUpdateRequest {
  seasonId: number;
  balancePoints: number;
  reservedPoints: number;
  realizedPnlPoints: number;
  tierScore: number;
}

export interface AdminPositionUpdateRequest {
  quantity: number;
  stakePoints: number;
}
