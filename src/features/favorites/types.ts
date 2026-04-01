export interface FavoriteStreamer {
  id: number;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface CreateFavoriteStreamerInput {
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string | null;
}

export interface ToggleFavoriteStreamerInput extends CreateFavoriteStreamerInput {
  isFavorited: boolean;
}
