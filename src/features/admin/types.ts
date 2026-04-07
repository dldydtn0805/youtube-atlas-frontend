export interface AdminSummaryMetrics {
  totalUsers: number;
  totalComments: number;
  totalFavorites: number;
  totalTrendRuns: number;
}

export interface AdminSeasonSummary {
  id: number;
  name: string;
  status: string;
  regionCode: string;
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
  latestTrendRun: AdminTrendRunSummary | null;
  recentUsers: AdminUserSummary[];
  recentComments: AdminCommentSummary[];
  recentFavorites: AdminFavoriteSummary[];
}

export interface AdminPlaybackProgress {
  videoId: string;
  videoTitle: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  positionSeconds: number;
  updatedAt: string;
}

export interface AdminUserGameSummary {
  seasonId: number;
  seasonName: string;
  participating: boolean;
  balancePoints: number | null;
  reservedPoints: number | null;
  realizedPnlPoints: number | null;
  totalAssetPoints: number | null;
  openPositionCount: number;
  closedPositionCount: number;
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
}

export interface AdminUserList {
  query: string | null;
  limit: number;
  count: number;
  users: AdminUserSummary[];
}

export interface AdminWalletUpdateRequest {
  balancePoints: number;
  reservedPoints: number;
  realizedPnlPoints: number;
}
