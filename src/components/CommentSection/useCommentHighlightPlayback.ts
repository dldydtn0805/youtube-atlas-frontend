import { useEffect, useRef, useState } from 'react';
import type { CommentHighlightMessage } from '../../features/comments/highlightTypes';

const MIN_MS = 5_000;
const MAX_MS = 10_000;

function nextDelayMs() {
  return Math.floor(MIN_MS + Math.random() * (MAX_MS - MIN_MS + 1));
}

export function useCommentHighlightPlayback(
  videoId: string | undefined,
  highlights: readonly CommentHighlightMessage[],
  enabled = true,
) {
  const [visible, setVisible] = useState<CommentHighlightMessage[]>([]);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let index = 0;

    function clearTimer() {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    }

    function revealNext() {
      const nextHighlight = highlights[index];

      if (cancelled || !nextHighlight) {
        return;
      }

      index += 1;
      setVisible((current) => [
        ...current,
        { ...nextHighlight, created_at: new Date().toISOString() },
      ]);

      if (index < highlights.length) {
        timerRef.current = window.setTimeout(revealNext, nextDelayMs());
      }
    }

    setVisible([]);
    clearTimer();

    if (enabled && videoId && highlights.length > 0) {
      revealNext();
    }

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [enabled, highlights, videoId]);

  return visible;
}
