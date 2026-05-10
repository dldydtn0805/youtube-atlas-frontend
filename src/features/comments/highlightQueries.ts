import { useQuery } from '@tanstack/react-query';
import { fetchCommentHighlights } from './api';

const COMMENT_HIGHLIGHTS_STALE_TIME_MS = 5 * 60 * 1000;

export function useVideoCommentHighlights(videoId?: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(videoId),
    queryKey: ['comments', 'video-highlights', videoId ?? 'none'],
    queryFn: () => fetchCommentHighlights(videoId ?? ''),
    staleTime: COMMENT_HIGHLIGHTS_STALE_TIME_MS,
  });
}
