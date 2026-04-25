import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

const SWIPE_CLOSE_THRESHOLD = 72;
const MAX_DRAG_OFFSET = 108;
const INTERACTIVE_TARGET_SELECTOR = 'button, a, input, textarea, select, label';

interface HeaderSwipeToCloseOptions {
  disabled?: boolean;
  onClose: () => void;
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest(INTERACTIVE_TARGET_SELECTOR);
}

function clampDragOffset(offset: number) {
  return Math.max(0, Math.min(offset, MAX_DRAG_OFFSET));
}

export default function useHeaderSwipeToClose({ disabled = false, onClose }: HeaderSwipeToCloseOptions) {
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isSwipeCandidateRef = useRef(false);
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
        if (disabled || event.pointerType === 'mouse' || isInteractiveTarget(event.target)) {
          return;
        }

        pointerIdRef.current = event.pointerId;
        startXRef.current = event.clientX;
        startYRef.current = event.clientY;
        isSwipeCandidateRef.current = true;
        setIsDragging(true);
        setDragOffset(0);
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

        setDragOffset(clampDragOffset(deltaY * 0.92));

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
          deltaY >= SWIPE_CLOSE_THRESHOLD &&
          deltaX <= deltaY * 0.7;

        resetSwipeState();

        if (shouldClose) {
          onClose();
        }
      },
    }),
    [disabled, onClose],
  );

  const modalStyle = useMemo<CSSProperties>(
    () => ({
      transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
      transition: isDragging ? 'none' : 'transform 220ms ease',
    }),
    [dragOffset, isDragging],
  );

  const backdropStyle = useMemo<CSSProperties>(
    () => ({
      opacity: dragOffset > 0 ? Math.max(0.6, 1 - dragOffset / 220) : undefined,
      transition: isDragging ? 'none' : 'opacity 220ms ease',
    }),
    [dragOffset, isDragging],
  );

  return {
    backdropStyle,
    headerSwipeHandlers: swipeHandlers,
    modalStyle,
  };
}
