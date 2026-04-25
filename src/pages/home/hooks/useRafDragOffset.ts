import { useCallback, useEffect, useRef, useState } from 'react';

export default function useRafDragOffset() {
  const [offset, setOffset] = useState(0);
  const frameRef = useRef<number | null>(null);
  const pendingOffsetRef = useRef(0);

  const flushOffset = useCallback(() => {
    frameRef.current = null;
    setOffset(pendingOffsetRef.current);
  }, []);

  const setDragOffset = useCallback((nextOffset: number) => {
    pendingOffsetRef.current = nextOffset;

    if (frameRef.current !== null || typeof window === 'undefined') {
      return;
    }

    frameRef.current = window.requestAnimationFrame(flushOffset);
  }, [flushOffset]);

  useEffect(() => () => {
    if (frameRef.current !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(frameRef.current);
    }
  }, []);

  return { dragOffset: offset, setDragOffset };
}
