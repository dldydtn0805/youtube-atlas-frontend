export interface YouTubeCategorySection {
  categoryId: string;
  label: string;
  description: string;
  availableCategories?: YouTubeAvailableCategory[];
  items: YouTubeVideoItem[];
  nextPageToken?: string;
}

export interface YouTubeAvailableCategory {
  id: string;
  label: string;
  count: number;
}

export interface YouTubeVideoCategoryListResponse {
  items: YouTubeVideoCategoryItem[];
}

export interface YouTubeVideoCategoryItem {
  id: string;
  snippet: {
    assignable: boolean;
    title: string;
  };
}

export interface YouTubeVideoListResponse {
  items: YouTubeVideoItem[];
  nextPageToken?: string;
}

export interface YouTubeVideoItem {
  id: string;
  contentDetails: {
    duration: string;
  };
  statistics?: {
    viewCount?: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    categoryId: string;
    categoryLabel?: string;
    thumbnails: YouTubeThumbnails;
  };
  trend?: {
    categoryLabel?: string;
    currentRank?: number | null;
    previousRank?: number | null;
    rankChange?: number | null;
    currentViewCount?: number | null;
    previousViewCount?: number | null;
    viewCountDelta?: number | null;
    isNew?: boolean;
    capturedAt?: string;
  };
}

export interface YouTubeThumbnails {
  default: YouTubeThumbnail;
  medium: YouTubeThumbnail;
  high: YouTubeThumbnail;
  standard?: YouTubeThumbnail;
  maxres?: YouTubeThumbnail;
}

export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}
