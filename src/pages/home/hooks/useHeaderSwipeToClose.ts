import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';

const TOUCH_SWIPE_CLOSE_THRESHOLD_RATIO = 0.3;
const TOUCH_MIN_SWIPE_CLOSE_THRESHOLD = 184;
const TOUCH_MAX_SWIPE_CLOSE_THRESHOLD = 252;
const MAX_DRAG_OFFSET_RATIO = 0.6;
const MIN_DRAG_OFFSET = 216;
const INTERACTIVE_TARGET_SELECTOR = 'button, a, input, textarea, select, label';
const FORM_CONTROL_TARGET_SELECTOR = 'input, textarea, select, label';
const BACKDROP_FADE_START_PROGRESS = 0.08;
const MIN_BACKDROP_OPACITY = 0.18;
const TOUCH_VISIBLE_DRAG_CLOSE_THRESHOLD = 188;
const CLOSE_ANIMATION_DURATION_MS = 220;
const BODY_CLOSE_ANIMATION_DURATION_MS = 330;
const MIN_CLOSE_ANIMATION_OFFSET = 360;
const SCROLL_TOP_CLOSE_TOLERANCE = 1;
const BODY_SWIPE_CLOSE_DISTANCE = 132;

interface HeaderSwipeToCloseOptions {
  disabled?: boolean;
  onClose: () => void;
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest(INTERACTIVE_TARGET_SELECTOR);
}

function isFormControlTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest(FORM_CONTROL_TARGET_SELECTOR);
}

function hasScrollableVerticalOverflow(element: HTMLElement) {
  if (typeof window === 'undefined') {
    return false;
  }

  const overflowY = window.getComputedStyle(element).overflowY;

  return (
    (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
    element.scrollHeight > element.clientHeight
  );
}

function getGestureScrollContainer(target: EventTarget | null, boundary: HTMLElement) {
  if (!(target instanceof HTMLElement)) {
    return boundary;
  }

  let element: HTMLElement | null = target;

  while (element && boundary.contains(element)) {
    if (element.scrollTop > SCROLL_TOP_CLOSE_TOLERANCE || hasScrollableVerticalOverflow(element)) {
      return element;
    }

    if (element === boundary) {
      break;
    }

    element = element.parentElement;
  }

  return boundary;
}

function isGestureScrollAtTop(target: EventTarget | null, boundary: HTMLElement) {
  return getGestureScrollContainer(target, boundary).scrollTop <= SCROLL_TOP_CLOSE_TOLERANCE;
}

function clampDragOffset(offset: number) {
  return Math.max(0, offset);
}

function preventDefault(event: { preventDefault: () => void }) {
  event.preventDefault();
}

function getFadeProgress(progress: number, fadeStartProgress: number) {
  if (progress <= fadeStartProgress) {
    return 0;
  }

  return Math.min((progress - fadeStartProgress) / (1 - fadeStartProgress), 1);
}

export default function useHeaderSwipeToClose({ disabled = false, onClose }: HeaderSwipeToCloseOptions) {
  const pointerIdRef = useRef<number | null>(null);
  const touchIdentifierRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const pendingDragOffsetRef = useRef(0);
  const isSwipeCandidateRef = useRef(false);
  const swipeCloseThresholdRef = useRef(TOUCH_MIN_SWIPE_CLOSE_THRESHOLD);
  const maxDragOffsetRef = useRef(MIN_DRAG_OFFSET);
  const closeTimerRef = useRef<number | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [closeAnimationDuration, setCloseAnimationDuration] = useState(CLOSE_ANIMATION_DURATION_MS);
  const [motionState, setMotionState] = useState<'idle' | 'dragging' | 'closing'>('idle');

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const cancelDragFrame = useCallback(() => {
    if (dragFrameRef.current !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
  }, []);

  const flushDragOffset = useCallback((nextOffset: number) => {
    pendingDragOffsetRef.current = nextOffset;
    dragOffsetRef.current = nextOffset;
    cancelDragFrame();
    setDragOffset(nextOffset);
  }, [cancelDragFrame]);

  const scheduleDragOffset = useCallback((nextOffset: number) => {
    pendingDragOffsetRef.current = nextOffset;
    dragOffsetRef.current = nextOffset;

    if (typeof window === 'undefined') {
      setDragOffset(nextOffset);
      return;
    }

    if (dragFrameRef.current !== null) {
      return;
    }

    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      setDragOffset(pendingDragOffsetRef.current);
    });
  }, []);

  const resetSwipeState = useCallback(() => {
    clearCloseTimer();
    cancelDragFrame();
    pointerIdRef.current = null;
    touchIdentifierRef.current = null;
    dragOffsetRef.current = 0;
    pendingDragOffsetRef.current = 0;
    isSwipeCandidateRef.current = false;
    setCloseAnimationDuration(CLOSE_ANIMATION_DURATION_MS);
    setMotionState('idle');
    setDragOffset(0);
  }, [cancelDragFrame, clearCloseTimer]);

  useEffect(
    () => () => {
      clearCloseTimer();
      cancelDragFrame();
    },
    [cancelDragFrame, clearCloseTimer],
  );

  useEffect(() => {
    if (disabled) {
      resetSwipeState();
    }
  }, [disabled, resetSwipeState]);

  const beginSwipe = useCallback((clientX: number, clientY: number) => {
    startXRef.current = clientX;
    startYRef.current = clientY;
    dragOffsetRef.current = 0;
    pendingDragOffsetRef.current = 0;
    isSwipeCandidateRef.current = true;
    const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight;
    swipeCloseThresholdRef.current = Math.min(
      TOUCH_MAX_SWIPE_CLOSE_THRESHOLD,
      Math.max(
        TOUCH_MIN_SWIPE_CLOSE_THRESHOLD,
        Math.round(viewportHeight * TOUCH_SWIPE_CLOSE_THRESHOLD_RATIO),
      ),
    );
    maxDragOffsetRef.current = Math.max(
      MIN_DRAG_OFFSET,
      Math.round(viewportHeight * MAX_DRAG_OFFSET_RATIO),
    );
    setMotionState('dragging');
    setDragOffset(0);
  }, []);

  const cancelSwipe = useCallback(() => {
    pointerIdRef.current = null;
    touchIdentifierRef.current = null;
    isSwipeCandidateRef.current = false;
    setCloseAnimationDuration(CLOSE_ANIMATION_DURATION_MS);
    setMotionState('idle');
    setDragOffset(0);
    dragOffsetRef.current = 0;
    pendingDragOffsetRef.current = 0;
  }, []);

  const closeWithSwipe = useCallback((resolvedDragOffset: number, durationMs = CLOSE_ANIMATION_DURATION_MS) => {
    clearCloseTimer();
    pointerIdRef.current = null;
    touchIdentifierRef.current = null;
    isSwipeCandidateRef.current = false;
    const viewportHeight = typeof window === 'undefined' ? MIN_CLOSE_ANIMATION_OFFSET : window.innerHeight;
    const closeOffset = Math.max(
      MIN_CLOSE_ANIMATION_OFFSET,
      Math.round(viewportHeight * 0.9),
      resolvedDragOffset + 180,
    );
    setCloseAnimationDuration(durationMs);
    setMotionState('closing');
    flushDragOffset(closeOffset);
    if (typeof window !== 'undefined') {
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        onClose();
      }, durationMs);
    } else {
      onClose();
    }
  }, [clearCloseTimer, flushDragOffset, onClose]);

  const moveSwipe = useCallback((clientX: number, clientY: number, event: { cancelable?: boolean; preventDefault: () => void }) => {
    const deltaX = Math.abs(clientX - startXRef.current);
    const deltaY = clientY - startYRef.current;

    if (deltaY <= 0) {
      cancelSwipe();
      return;
    }

    if (deltaY < 10) {
      preventDefault(event);
      return;
    }

    if (deltaX > deltaY * 0.7) {
      cancelSwipe();
      return;
    }

    const nextDragOffset = Math.min(clampDragOffset(deltaY * 0.92), maxDragOffsetRef.current);
    scheduleDragOffset(nextDragOffset);

    preventDefault(event);
  }, [cancelSwipe, scheduleDragOffset]);

  const shouldCloseSwipe = useCallback((clientX: number, clientY: number) => {
    const deltaX = Math.abs(clientX - startXRef.current);
    const deltaY = clientY - startYRef.current;

    return (
      isSwipeCandidateRef.current &&
      deltaX <= deltaY * 0.7 &&
      (
        deltaY >= swipeCloseThresholdRef.current ||
        dragOffsetRef.current >= TOUCH_VISIBLE_DRAG_CLOSE_THRESHOLD
      )
    );
  }, []);

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
          motionState === 'closing' ||
          event.pointerType === 'mouse' ||
          (event.pointerType !== 'touch' && event.pointerType !== 'pen') ||
          isInteractiveTarget(event.target)
        ) {
          return;
        }

        pointerIdRef.current = event.pointerId;
        beginSwipe(event.clientX, event.clientY);
        if (typeof event.currentTarget.setPointerCapture === 'function') {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      },
      onPointerMove(event: ReactPointerEvent<HTMLElement>) {
        if (disabled || pointerIdRef.current !== event.pointerId || !isSwipeCandidateRef.current) {
          return;
        }

        moveSwipe(event.clientX, event.clientY, event);
      },
      onPointerUp(event: ReactPointerEvent<HTMLElement>) {
        if (disabled || pointerIdRef.current !== event.pointerId) {
          return;
        }

        const resolvedDragOffset = dragOffsetRef.current;
        const shouldClose = shouldCloseSwipe(event.clientX, event.clientY);

        if (
          typeof event.currentTarget.hasPointerCapture === 'function' &&
          typeof event.currentTarget.releasePointerCapture === 'function' &&
          event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }

        if (shouldClose) {
          closeWithSwipe(resolvedDragOffset);
          return;
        }

        resetSwipeState();
      },
    }),
    [beginSwipe, closeWithSwipe, disabled, motionState, moveSwipe, resetSwipeState, shouldCloseSwipe],
  );

  const bodySwipeHandlers = useMemo(
    () => ({
      onTouchCancel() {
        resetSwipeState();
      },
      onTouchEnd(event: ReactTouchEvent<HTMLElement>) {
        if (disabled || touchIdentifierRef.current === null) {
          return;
        }

        const touch = Array.from(event.changedTouches).find((item) => item.identifier === touchIdentifierRef.current);
        if (!touch) {
          return;
        }

        const deltaX = Math.abs(touch.clientX - startXRef.current);
        const deltaY = touch.clientY - startYRef.current;
        if (!isSwipeCandidateRef.current && deltaY >= BODY_SWIPE_CLOSE_DISTANCE && deltaX <= deltaY * 0.7) {
          closeWithSwipe(BODY_SWIPE_CLOSE_DISTANCE, BODY_CLOSE_ANIMATION_DURATION_MS);
          return;
        }

        const resolvedDragOffset = dragOffsetRef.current;
        if (shouldCloseSwipe(touch.clientX, touch.clientY)) {
          closeWithSwipe(resolvedDragOffset, BODY_CLOSE_ANIMATION_DURATION_MS);
          return;
        }

        resetSwipeState();
      },
      onTouchMove(event: ReactTouchEvent<HTMLElement>) {
        if (disabled || touchIdentifierRef.current === null) {
          return;
        }

        const touch = Array.from(event.touches).find((item) => item.identifier === touchIdentifierRef.current);
        if (!touch) {
          resetSwipeState();
          return;
        }

        if (!isSwipeCandidateRef.current) {
          const deltaX = Math.abs(touch.clientX - startXRef.current);
          const deltaY = touch.clientY - startYRef.current;

          if (deltaY <= 0 || (deltaY >= 10 && deltaX > deltaY * 0.7)) {
            cancelSwipe();
          }
          return;
        }

        moveSwipe(touch.clientX, touch.clientY, event);
      },
      onTouchStart(event: ReactTouchEvent<HTMLElement>) {
        if (
          disabled ||
          motionState === 'closing' ||
          event.touches.length !== 1 ||
          !isGestureScrollAtTop(event.target, event.currentTarget) ||
          isFormControlTarget(event.target)
        ) {
          return;
        }

        const touch = event.touches[0];
        if (!touch) {
          return;
        }

        touchIdentifierRef.current = touch.identifier;
        startXRef.current = touch.clientX;
        startYRef.current = touch.clientY;
        dragOffsetRef.current = 0;
        pendingDragOffsetRef.current = 0;
        isSwipeCandidateRef.current = false;
      },
    }),
    [cancelSwipe, closeWithSwipe, disabled, motionState, moveSwipe, resetSwipeState, shouldCloseSwipe],
  );

  const modalStyle = useMemo<CSSProperties>(
    () => {
      const isDragging = motionState === 'dragging';
      const isClosing = motionState === 'closing';

      return {
        transform: dragOffset > 0 ? `translate3d(0, ${dragOffset}px, 0)` : undefined,
        transition: isDragging ? 'none' : `transform ${closeAnimationDuration}ms ease-out`,
        willChange: isDragging || isClosing ? 'transform' : undefined,
      };
    },
    [closeAnimationDuration, dragOffset, motionState],
  );

  const backdropStyle = useMemo<CSSProperties>(
    () => {
      const isDragging = motionState === 'dragging';
      const isClosing = motionState === 'closing';
      const dragProgress =
        maxDragOffsetRef.current > 0 ? Math.min(Math.max(dragOffset / maxDragOffsetRef.current, 0), 1) : 0;
      const fadeProgress = getFadeProgress(dragProgress, BACKDROP_FADE_START_PROGRESS);
      const easedFadeProgress = fadeProgress ** 2;

      return {
        opacity: dragOffset > 0 ? Math.max(MIN_BACKDROP_OPACITY, 1 - easedFadeProgress * 0.82) : undefined,
        transition: isDragging ? 'none' : `opacity ${closeAnimationDuration}ms ease-out`,
        willChange: isDragging || isClosing ? 'opacity' : undefined,
      };
    },
    [closeAnimationDuration, dragOffset, motionState],
  );

  return {
    backdropStyle,
    bodySwipeHandlers,
    headerSwipeHandlers: swipeHandlers,
    modalStyle,
  };
}
