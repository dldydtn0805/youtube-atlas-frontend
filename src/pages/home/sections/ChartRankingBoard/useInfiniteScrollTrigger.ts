import { useEffect } from 'react';
import type { MutableRefObject } from 'react';

interface UseInfiniteScrollTriggerOptions {
  enabled: boolean;
  onReachEnd: () => void;
  rootMargin?: string;
  targetRef: MutableRefObject<HTMLDivElement | null>;
}

export default function useInfiniteScrollTrigger({
  enabled,
  onReachEnd,
  rootMargin = '320px 0px',
  targetRef,
}: UseInfiniteScrollTriggerOptions) {
  useEffect(() => {
    const targetElement = targetRef.current;

    if (!enabled || !targetElement || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onReachEnd();
        }
      },
      { rootMargin },
    );

    observer.observe(targetElement);

    return () => observer.disconnect();
  }, [enabled, onReachEnd, rootMargin, targetRef]);
}
