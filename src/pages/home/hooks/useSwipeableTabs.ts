import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { resolveSwipeDirection } from './swipeDirection';
import { lockSwipeScroll } from './swipeScrollLock';

interface UseSwipeableTabsOptions<TTab extends string> {
  enabled?: boolean;
  onChange: (tab: TTab) => void;
  order: readonly TTab[];
  threshold?: number;
  value: TTab;
}

const DEFAULT_THRESHOLD = 56;
const DIRECTION_LOCK_THRESHOLD = 10;

function isIgnoredSwipeTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest('input, textarea, select');
}

function releasePointerCapture(target: EventTarget | null, pointerId: number | null) {
  if (
    pointerId === null ||
    !(target instanceof HTMLElement) ||
    typeof target.hasPointerCapture !== 'function' ||
    typeof target.releasePointerCapture !== 'function' ||
    !target.hasPointerCapture(pointerId)
  ) {
    return;
  }

  target.releasePointerCapture(pointerId);
}

export default function useSwipeableTabs<TTab extends string>({
  enabled = true,
  onChange,
  order,
  threshold = DEFAULT_THRESHOLD,
  value,
}: UseSwipeableTabsOptions<TTab>) {
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lockDirectionRef = useRef<'horizontal' | 'vertical' | null>(null);
  const releaseScrollLockRef = useRef<(() => void) | null>(null);

  const resetGesture = useCallback(() => {
    releaseScrollLockRef.current?.();
    releaseScrollLockRef.current = null;
    pointerIdRef.current = null;
    lockDirectionRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (
        !enabled ||
        (event.pointerType === 'mouse' && event.button !== 0) ||
        isIgnoredSwipeTarget(event.target)
      ) {
        return;
      }

      pointerIdRef.current = event.pointerId;
      startXRef.current = event.clientX;
      startYRef.current = event.clientY;
      lockDirectionRef.current = null;
      releaseScrollLockRef.current?.();
      releaseScrollLockRef.current = null;
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || pointerIdRef.current !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - startXRef.current;
      const deltaY = event.clientY - startYRef.current;

      if (lockDirectionRef.current === null) {
        lockDirectionRef.current = resolveSwipeDirection(deltaX, deltaY, DIRECTION_LOCK_THRESHOLD);
      }

      if (lockDirectionRef.current === null) {
        return;
      }

      if (lockDirectionRef.current !== 'horizontal') {
        return;
      }

      if (releaseScrollLockRef.current === null) {
        releaseScrollLockRef.current = lockSwipeScroll([event.currentTarget]);
      }

      if (event.cancelable) {
        event.preventDefault();
      }
    },
    [enabled],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || pointerIdRef.current !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - startXRef.current;
      const activeIndex = order.indexOf(value);

      const swipeDirection =
        lockDirectionRef.current ?? resolveSwipeDirection(deltaX, event.clientY - startYRef.current, DIRECTION_LOCK_THRESHOLD);

      if (
        swipeDirection === 'horizontal' &&
        activeIndex >= 0 &&
        Math.abs(deltaX) >= threshold
      ) {
        if (order.length > 0) {
          const nextIndex = deltaX < 0
            ? (activeIndex + 1) % order.length
            : (activeIndex - 1 + order.length) % order.length;

          onChange(order[nextIndex]);
        }
      }

      releasePointerCapture(event.currentTarget, event.pointerId);
      resetGesture();
    },
    [enabled, onChange, order, resetGesture, threshold, value],
  );

  const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    releasePointerCapture(event.currentTarget, event.pointerId);
    resetGesture();
  }, [resetGesture]);

  return {
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
