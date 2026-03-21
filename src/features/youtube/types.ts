export interface YouTubeCategorySection {
  categoryId: string;
  label: string;
  description: string;
  items: YouTubeVideoItem[];
  nextPageToken?: string;
}

export interface YouTubeVideoListResponse {
  items: YouTubeVideoItem[];
  nextPageToken?: string;
}

export interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
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
