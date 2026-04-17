import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { VideoTrendSignal } from '../../../features/trending/types';
import { getFullscreenElement } from '../utils';

interface TrendTickerProps {
  currentTierCode?: string;
  isAuthenticated?: boolean;
  items: VideoTrendSignal[];
  onSelect?: (videoId: string) => void;
}

const DEFAULT_ROTATION_MS = 2600;
const DROPDOWN_GAP_PX = 10;
const DROPDOWN_WIDTH_PX = 420;
const TICKER_ITEM_HEIGHT_REM = 1.4;
const VIEWPORT_MARGIN_PX = 16;

function formatTickerDelta(signal: VideoTrendSignal) {
  if (signal.isNew) {
    return 'NEW';
  }

  if (typeof signal.rankChange === 'number' && signal.rankChange > 0) {
    return `+${signal.rankChange}`;
  }

  return signal.previousRank ? `${signal.previousRank}→${signal.currentRank}` : `${signal.currentRank}위`;
}

export default function TrendTicker({
  currentTierCode,
  isAuthenticated = false,
  items,
  onSelect,
}: TrendTickerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const tickerItems = useMemo(() => items.slice(0, 10), [items]);

  useEffect(() => {
    setActiveIndex(0);
  }, [tickerItems.length]);

  useEffect(() => {
    if (tickerItems.length <= 1 || isOpen || isPaused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % tickerItems.length);
    }, DEFAULT_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [isOpen, isPaused, tickerItems.length]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !buttonRef.current || typeof window === 'undefined') {
      return undefined;
    }

    const updateDropdownPosition = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      const maxWidth = Math.min(DROPDOWN_WIDTH_PX, window.innerWidth - VIEWPORT_MARGIN_PX * 2);
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN_PX, buttonRect.right - maxWidth),
        window.innerWidth - maxWidth - VIEWPORT_MARGIN_PX,
      );
      const estimatedHeight = dropdownRef.current?.offsetHeight ?? 380;
      const canOpenBelow =
        buttonRect.bottom + DROPDOWN_GAP_PX + estimatedHeight <= window.innerHeight - VIEWPORT_MARGIN_PX;
      const top = canOpenBelow
        ? buttonRect.bottom + DROPDOWN_GAP_PX
        : Math.max(VIEWPORT_MARGIN_PX, buttonRect.top - estimatedHeight - DROPDOWN_GAP_PX);

      setDropdownStyle({
        left,
        top,
        width: maxWidth,
      });
    };

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen]);

  if (tickerItems.length === 0) {
    return null;
  }

  const activeItem = tickerItems[activeIndex] ?? tickerItems[0];
  const portalTarget =
    typeof document === 'undefined'
      ? null
      : getFullscreenElement() instanceof HTMLElement
        ? getFullscreenElement()
        : document.body;
  const dropdown = isOpen && portalTarget
    ? createPortal(
        <div
          ref={dropdownRef}
          className="app-shell__trend-ticker-dropdown"
          data-authenticated={isAuthenticated ? 'true' : 'false'}
          data-current-tier={currentTierCode}
          role="dialog"
          aria-label="급상승 인기 순위"
          style={
            dropdownStyle
              ? {
                  left: `${dropdownStyle.left}px`,
                  top: `${dropdownStyle.top}px`,
                  width: `${dropdownStyle.width}px`,
                }
              : undefined
          }
        >
          <div className="app-shell__trend-ticker-dropdown-header">
            <strong>순위 변동 Top 10</strong>
            <span>최근 집계 기준</span>
          </div>
          <ol className="app-shell__trend-ticker-list">
            {tickerItems.map((item, index) => (
              <li key={item.videoId} className="app-shell__trend-ticker-list-item">
                <button
                  className="app-shell__trend-ticker-list-button"
                  onClick={() => {
                    onSelect?.(item.videoId);
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  <span className="app-shell__trend-ticker-list-rank">{index + 1}</span>
                  <span className="app-shell__trend-ticker-list-copy">
                    <span className="app-shell__trend-ticker-list-title">{item.title ?? item.videoId}</span>
                    <span className="app-shell__trend-ticker-list-meta">
                      {item.currentRank}위
                      {item.isNew
                        ? ' · 신규 진입'
                        : typeof item.rankChange === 'number' && item.rankChange > 0
                          ? ` · ${item.rankChange}계단 상승`
                          : item.previousRank
                            ? ` · ${item.previousRank}위에서 이동`
                            : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>,
        portalTarget,
      )
    : null;

  return (
    <div
      ref={rootRef}
      className="app-shell__trend-ticker"
      data-authenticated={isAuthenticated ? 'true' : 'false'}
      data-current-tier={currentTierCode}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="app-shell__trend-ticker-button"
        ref={buttonRef}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span className="app-shell__trend-ticker-label">인기 급상승</span>
        <span className="app-shell__trend-ticker-viewport" aria-live="polite">
          <span
            className="app-shell__trend-ticker-track"
            style={{ transform: `translateY(calc(-${activeIndex} * ${TICKER_ITEM_HEIGHT_REM}rem))` }}
          >
            {tickerItems.map((item, index) => (
              <span
                key={`${item.videoId}:${index}`}
                className="app-shell__trend-ticker-item"
              >
                <span className="app-shell__trend-ticker-rank">{index + 1}</span>
                <span className="app-shell__trend-ticker-title">{item.title ?? item.videoId}</span>
              </span>
            ))}
          </span>
        </span>
        <span className="app-shell__trend-ticker-delta">{formatTickerDelta(activeItem)}</span>
      </button>
      {dropdown}
    </div>
  );
}
