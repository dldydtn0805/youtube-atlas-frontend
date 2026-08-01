export type YouTubeVideoRating = 'like' | 'none';

export interface YouTubeVideoRatingResult {
  rating: YouTubeVideoRating;
  videoId: string;
}
