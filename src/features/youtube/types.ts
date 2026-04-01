export interface YouTubeCategorySection {
  categoryId: string;
  label: string;
  description: string;
  items: YouTubeVideoItem[];
  nextPageToken?: string;
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
    thumbnails: YouTubeThumbnails;
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
