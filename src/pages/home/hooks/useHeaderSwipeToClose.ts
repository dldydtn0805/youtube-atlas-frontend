import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

const SWIPE_CLOSE_THRESHOLD_RATIO = 0.35;
const MIN_SWIPE_CLOSE_THRESHOLD = 216;
const MAX_DRAG_OFFSET_RATIO = 0.6;
const MIN_DRAG_OFFSET = 216;
const INTERACTIVE_TARGET_SELECTOR = 'button, a, input, textarea, select, label';

interface HeaderSwipeToCloseOptions {
  disabled?: boolean;
  onClose: () => void;
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest(INTERACTIVE_TARGET_SELECTOR);
}

function clampDragOffset(offset: number) {
  return Math.max(0, offset);
}

export default function useHeaderSwipeToClose({ disabled = false, onClose }: HeaderSwipeToCloseOptions) {
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isSwipeCandidateRef = useRef(false);
  const swipeCloseThresholdRef = useRef(MIN_SWIPE_CLOSE_THRESHOLD);
  const maxDragOffsetRef = useRef(MIN_DRAG_OFFSET);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const resetSwipeState = () => {
    pointerIdRef.current = null;
    isSwipeCandidateRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  };

  const swipeHandlers = useMemo(
    () => ({
      onPointerCancel(event: ReactPointerEvent<HTMLElement>) {
        if (pointerIdRef.current !== event.pointerId) {
          return;
        }

        resetSwipeState();
      },
      onPointerDown(event: ReactPointerEvent<HTMLElement>) {
        if (
          disabled ||
          (event.pointerType === 'mouse' && event.button !== 0) ||
          isInteractiveTarget(event.target)
        ) {
          return;
        }

        pointerIdRef.current = event.pointerId;
        startXRef.current = event.clientX;
        startYRef.current = event.clientY;
        isSwipeCandidateRef.current = true;
        const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight;
        swipeCloseThresholdRef.current = Math.max(
          MIN_SWIPE_CLOSE_THRESHOLD,
          Math.round(viewportHeight * SWIPE_CLOSE_THRESHOLD_RATIO),
        );
        maxDragOffsetRef.current = Math.max(
          MIN_DRAG_OFFSET,
          Math.round(viewportHeight * MAX_DRAG_OFFSET_RATIO),
        );
        setIsDragging(true);
        setDragOffset(0);
        if (typeof event.currentTarget.setPointerCapture === 'function') {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      },
      onPointerMove(event: ReactPointerEvent<HTMLElement>) {
        if (disabled || pointerIdRef.current !== event.pointerId || !isSwipeCandidateRef.current) {
          return;
        }

        const deltaX = Math.abs(event.clientX - startXRef.current);
        const deltaY = event.clientY - startYRef.current;

        if (deltaY <= 0) {
          isSwipeCandidateRef.current = false;
          setIsDragging(false);
          setDragOffset(0);
          return;
        }

        if (deltaY < 10) {
          return;
        }

        if (deltaX > deltaY * 0.7) {
          isSwipeCandidateRef.current = false;
          setIsDragging(false);
          setDragOffset(0);
          return;
        }

        setDragOffset(Math.min(clampDragOffset(deltaY * 0.92), maxDragOffsetRef.current));

        if (event.cancelable) {
          event.preventDefault();
        }
      },
      onPointerUp(event: ReactPointerEvent<HTMLElement>) {
        if (disabled || pointerIdRef.current !== event.pointerId) {
          return;
        }

        const deltaX = Math.abs(event.clientX - startXRef.current);
        const deltaY = event.clientY - startYRef.current;
        const shouldClose =
          isSwipeCandidateRef.current &&
          deltaY >= swipeCloseThresholdRef.current &&
          deltaX <= deltaY * 0.7;

        resetSwipeState();
        if (
          typeof event.currentTarget.hasPointerCapture === 'function' &&
          typeof event.currentTarget.releasePointerCapture === 'function' &&
          event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }

        if (shouldClose) {
          onClose();
        }
      },
    }),
    [disabled, onClose],
  );

  const modalStyle = useMemo<CSSProperties>(
    () => {
      const fadeProgress =
        maxDragOffsetRef.current > 0 ? Math.min(Math.max(dragOffset / maxDragOffsetRef.current, 0), 1) : 0;
      const easedFadeProgress = fadeProgress ** 1.8;

      return {
        transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
        opacity: dragOffset > 0 ? Math.max(0.25, 1 - easedFadeProgress * 0.42) : undefined,
        transition: isDragging ? 'none' : 'transform 220ms ease, opacity 220ms ease',
      };
    },
    [dragOffset, isDragging],
  );

  const backdropStyle = useMemo<CSSProperties>(
    () => {
      const fadeProgress =
        maxDragOffsetRef.current > 0 ? Math.min(Math.max(dragOffset / maxDragOffsetRef.current, 0), 1) : 0;
      const easedFadeProgress = fadeProgress ** 1.6;

      return {
        opacity: dragOffset > 0 ? Math.max(0.25, 1 - easedFadeProgress * 0.78) : undefined,
        transition: isDragging ? 'none' : 'opacity 220ms ease',
      };
    },
    [dragOffset, isDragging],
  );

  return {
    backdropStyle,
    headerSwipeHandlers: swipeHandlers,
    modalStyle,
  };
}
