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
  thumbnailUrl?: string;
  videoId: string;
  viewCountDelta: number | null;
}

export interface RealtimeSurgingResponse {
  regionCode: string;
  categoryId: string;
  categoryLabel: string;
  rankChangeThreshold: number;
  totalCount: number;
  capturedAt: string | null;
  items: VideoTrendSignal[];
}
