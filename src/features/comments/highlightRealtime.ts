import { useEffect, useState } from 'react';
import { fetchCommentHighlights } from './api';
import type { CommentHighlightMessage } from './highlightTypes';

export function useCommentHighlights(
  videoId?: string,
  accessToken?: string | null,
  enabled = true,
) {
  const [highlights, setHighlights] = useState<CommentHighlightMessage[]>([]);

  useEffect(() => {
    setHighlights([]);

    if (!enabled || !videoId || !accessToken) {
      return;
    }

    let cancelled = false;

    void fetchCommentHighlights(videoId)
      .then((items) => {
        if (!cancelled) {
          setHighlights(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHighlights([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, enabled, videoId]);

  return highlights;
}
