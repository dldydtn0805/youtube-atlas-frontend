import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent, type WheelEvent } from 'react';

const PULL_REFRESH_TRIGGER_PX = 125;
const MAX_PULL_DISTANCE_PX = 154;
const WHEEL_REFRESH_SETTLE_MS = 120;
const WHEEL_PULL_DELTA_FACTOR = 0.28;
const WHEEL_PULL_DELTA_MAX = 18;

interface UseGamePanelPullToRefreshOptions<TTab extends string> {
  activeTab: TTab;
  disabled?: boolean;
  onRefresh?: (tab: TTab) => Promise<void> | void;
}

export default function useGamePanelPullToRefresh<TTab extends string>({
  activeTab,
  disabled = false,
  onRefresh,
}: UseGamePanelPullToRefreshOptions<TTab>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const pendingPullDistanceRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const wheelPullDistanceRef = useRef(0);
  const wheelRefreshTimeoutRef = useRef<number | null>(null);

  const syncPullDistance = useCallback((nextPullDistance: number, immediate = false) => {
    pullDistanceRef.current = nextPullDistance;

    if (typeof window === 'undefined' || immediate) {
      if (animationFrameRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      pendingPullDistanceRef.current = null;
      setPullDistance((currentPullDistance) =>
        currentPullDistance === nextPullDistance ? currentPullDistance : nextPullDistance,
      );
      return;
    }

    pendingPullDistanceRef.current = nextPullDistance;

    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      const committedPullDistance = pendingPullDistanceRef.current ?? pullDistanceRef.current;
      pendingPullDistanceRef.current = null;
      setPullDistance((currentPullDistance) =>
        currentPullDistance === committedPullDistance ? currentPullDistance : committedPullDistance,
      );
    });
  }, []);

  const resetPullState = useCallback(() => {
    touchStartYRef.current = null;
    wheelPullDistanceRef.current = 0;
    if (wheelRefreshTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(wheelRefreshTimeoutRef.current);
      wheelRefreshTimeoutRef.current = null;
    }
    syncPullDistance(0, true);
  }, [syncPullDistance]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      if (wheelRefreshTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(wheelRefreshTimeoutRef.current);
      }
    },
    [],
  );

  const runRefresh = useCallback(async () => {
    if (disabled || isRefreshing || !onRefresh) {
      return;
    }

    setIsRefreshing(true);
    syncPullDistance(PULL_REFRESH_TRIGGER_PX, true);

    try {
      await onRefresh(activeTab);
    } finally {
      resetPullState();
      setIsRefreshing(false);
    }
  }, [activeTab, disabled, isRefreshing, onRefresh, resetPullState, syncPullDistance]);

  const bind = useMemo(
    () => ({
      onTouchStart: (event: TouchEvent<HTMLDivElement>) => {
        if (disabled || isRefreshing || event.currentTarget.scrollTop > 0) {
          return;
        }

        touchStartYRef.current = event.touches[0]?.clientY ?? null;
      },
      onTouchMove: (event: TouchEvent<HTMLDivElement>) => {
        if (disabled || isRefreshing || touchStartYRef.current === null) {
          return;
        }

        if (event.currentTarget.scrollTop > 0) {
          resetPullState();
          return;
        }

        const nextDistance = Math.max(0, (event.touches[0]?.clientY ?? 0) - touchStartYRef.current);
        syncPullDistance(Math.min(nextDistance, MAX_PULL_DISTANCE_PX));
      },
      onTouchEnd: () => {
        if (pullDistanceRef.current >= PULL_REFRESH_TRIGGER_PX) {
          void runRefresh();
          return;
        }

        resetPullState();
      },
      onTouchCancel: resetPullState,
      onWheel: (event: WheelEvent<HTMLDivElement>) => {
        if (disabled || isRefreshing) {
          return;
        }

        if (event.currentTarget.scrollTop > 0 || event.deltaY >= 0) {
          if (wheelPullDistanceRef.current < PULL_REFRESH_TRIGGER_PX) {
            resetPullState();
          }
          return;
        }

        const normalizedWheelDelta = Math.min(
          Math.abs(event.deltaY) * WHEEL_PULL_DELTA_FACTOR,
          WHEEL_PULL_DELTA_MAX,
        );

        wheelPullDistanceRef.current = Math.min(
          wheelPullDistanceRef.current + normalizedWheelDelta,
          MAX_PULL_DISTANCE_PX,
        );
        syncPullDistance(wheelPullDistanceRef.current);

        if (wheelPullDistanceRef.current >= PULL_REFRESH_TRIGGER_PX) {
          if (wheelRefreshTimeoutRef.current !== null && typeof window !== 'undefined') {
            window.clearTimeout(wheelRefreshTimeoutRef.current);
          }

          if (typeof window !== 'undefined') {
            wheelRefreshTimeoutRef.current = window.setTimeout(() => {
              wheelRefreshTimeoutRef.current = null;
              void runRefresh();
            }, WHEEL_REFRESH_SETTLE_MS);
          }
        }
      },
    }),
    [disabled, isRefreshing, resetPullState, runRefresh, syncPullDistance],
  );

  return {
    bind,
    isRefreshing,
    isReadyToRefresh: pullDistance >= PULL_REFRESH_TRIGGER_PX,
    pullDistance,
  };
}
