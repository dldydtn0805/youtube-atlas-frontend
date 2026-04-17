export interface VideoTrendSignal {
  categoryId: string;
  categoryLabel: string;
  capturedAt: string;
  currentRank: number;
  currentViewCount: number | null;
  isNew: boolean;
  previousRank: number | null;
  previousViewCount: number | null;
  rankChange: number | null;
  regionCode: string;
  title?: string;
  channelTitle?: string;
  channelId?: string;
  thumbnailUrl?: string;
  videoId: string;
  viewCountDelta: number | null;
}

export interface TrendSignalFeedResponse {
  regionCode: string;
  categoryId: string;
  categoryLabel: string;
  totalCount: number;
  capturedAt: string | null;
  items: VideoTrendSignal[];
}

export interface RealtimeSurgingResponse extends TrendSignalFeedResponse {
  rankChangeThreshold: number;
}

export interface TopRankRisersResponse extends TrendSignalFeedResponse {
  limit: number;
}

export type NewChartEntriesResponse = TrendSignalFeedResponse;

export interface VideoRankHistoryPoint {
  runId: number;
  capturedAt: string;
  rank: number | null;
  viewCount: number | null;
  chartOut: boolean;
}

export interface VideoRankHistory {
  regionCode: string;
  categoryId: string;
  categoryLabel: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  latestRank: number | null;
  latestChartOut: boolean;
  latestCapturedAt: string;
  points: VideoRankHistoryPoint[];
}
