import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { GameTierProgress } from '../../../features/game/types';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useRafDragOffset from '../hooks/useRafDragOffset';
import { lockSwipeScroll } from '../hooks/swipeScrollLock';
import { resolveSwipeDirection } from '../hooks/swipeDirection';
import { getFullscreenElement } from '../utils';
import GameTierSummary from './GameTierSummary';
import GameTierGuide from './GameTierGuide';
import './GameTierModal.css';

interface GameTierModalProps {
  defaultTab?: 'tier' | 'highlights' | 'ranking';
  highlightsContent?: ReactNode;
  isOpen: boolean;
  isTierProgressLoading?: boolean;
  onClose: () => void;
  rankingContent?: ReactNode;
  tierProgress?: GameTierProgress;
}

type TierModalTab = 'tier' | 'highlights' | 'ranking';

const TIER_MODAL_TABS: ReadonlyArray<{ id: TierModalTab; label: string }> = [
  { id: 'tier', label: '내 카드' },
  { id: 'highlights', label: '하이라이트' },
  { id: 'ranking', label: '랭킹' },
];

const SWIPE_THRESHOLD = 56;
const DIRECTION_LOCK_THRESHOLD = 10;
const TIER_MODAL_CAROUSEL_GAP = 0;
const TIER_MODAL_CAROUSEL_SIDE_PADDING = 0;
const INTERACTIVE_SWIPE_SELECTOR = 'input, textarea, select';

function getWrappedTierModalIndex(index: number) {
  return (index + TIER_MODAL_TABS.length) % TIER_MODAL_TABS.length;
}

function shouldIgnoreSwipeTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest(INTERACTIVE_SWIPE_SELECTOR);
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

export default function GameTierModal({
  defaultTab = 'tier',
  highlightsContent,
  isOpen,
  isTierProgressLoading = false,
  onClose,
  rankingContent,
  tierProgress,
}: GameTierModalProps) {
  useBodyScrollLock(isOpen);

  const [activeTab, setActiveTab] = useState<TierModalTab>(defaultTab);
  const [trackIndex, setTrackIndex] = useState(TIER_MODAL_TABS.findIndex((tab) => tab.id === defaultTab) + 1);
  const [isTrackAnimating, setIsTrackAnimating] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const directionLockRef = useRef<'horizontal' | 'vertical' | null>(null);
  const shouldSuppressClickRef = useRef(false);
  const viewportWidthRef = useRef(0);
  const releaseScrollLockRef = useRef<(() => void) | null>(null);
  const { dragOffset, setDragOffset } = useRafDragOffset();
  const activeIndex = TIER_MODAL_TABS.findIndex((tab) => tab.id === activeTab);
  const carouselTabs = useMemo(
    () => [TIER_MODAL_TABS[TIER_MODAL_TABS.length - 1], ...TIER_MODAL_TABS, TIER_MODAL_TABS[0]],
    [],
  );

  const tierPanelContent = (
    <div className="app-shell__modal-fields">
      {tierProgress || isTierProgressLoading ? (
        <section
          className="app-shell__modal-field app-shell__modal-field--tier app-shell__tier-modal-card-shell"
          data-loading={isTierProgressLoading}
        >
          {tierProgress ? (
            <GameTierSummary
              progress={tierProgress}
              showLadder={false}
              surfaceVariant="highlight-tier"
              title=""
            />
          ) : null}
          {isTierProgressLoading ? (
            <div className="app-shell__tier-modal-card-overlay" role="status" aria-live="polite">
              <span className="app-shell__tier-modal-card-spinner" aria-hidden="true" />
              <span className="sr-only">티어 카드 불러오는 중</span>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="app-shell__modal-field">
        <div className="app-shell__section-heading">
          <p className="app-shell__section-eyebrow">티어 설명</p>
          <h3 className="app-shell__modal-field-title">하이라이트 티어 기준</h3>
        </div>
        <GameTierGuide />
      </section>
    </div>
  );

  const tabPanels = {
    highlights: highlightsContent ?? (
      <p className="app-shell__game-empty app-shell__tier-modal-empty-state">하이라이트가 없습니다.</p>
    ),
    ranking: rankingContent ?? <p className="app-shell__game-empty">랭킹 정보를 불러올 수 없습니다.</p>,
    tier: tierPanelContent,
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setTrackIndex(TIER_MODAL_TABS.findIndex((tab) => tab.id === defaultTab) + 1);
      setDragOffset(0);
      setIsTrackAnimating(false);
    }
  }, [defaultTab, isOpen]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || typeof window === 'undefined') {
      return;
    }

    const syncViewportWidth = () => {
      const nextWidth = viewport.clientWidth;
      viewportWidthRef.current = nextWidth;
      setViewportWidth(nextWidth);
    };

    syncViewportWidth();
    window.addEventListener('resize', syncViewportWidth);

    return () => {
      window.removeEventListener('resize', syncViewportWidth);
    };
  }, [isOpen]);

  useEffect(() => {
    viewportRef.current
      ?.querySelectorAll<HTMLElement>(`[data-tier-modal-panel="${activeTab}"]`)
      .forEach((panel) => {
        panel.scrollTo({ top: 0 });
      });
  }, [activeTab]);

  if (
    !isOpen ||
    typeof document === 'undefined' ||
    (!tierProgress && !isTierProgressLoading && !rankingContent && !highlightsContent)
  ) {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;
  const handleSelectTab = (nextTab: TierModalTab) => {
    const nextIndex = TIER_MODAL_TABS.findIndex((tab) => tab.id === nextTab);

    if (nextIndex < 0) {
      return;
    }

    setIsTrackAnimating(true);
    setDragOffset(0);
    setActiveTab(nextTab);
    setTrackIndex(nextIndex + 1);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      (event.pointerType === 'mouse' && event.button !== 0) ||
      shouldIgnoreSwipeTarget(event.target)
    ) {
      return;
    }

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    directionLockRef.current = null;
    shouldSuppressClickRef.current = false;
    viewportWidthRef.current = event.currentTarget.clientWidth;
    releaseScrollLockRef.current?.();
    releaseScrollLockRef.current = null;
    setIsTrackAnimating(false);
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - startXRef.current;
    const deltaY = event.clientY - startYRef.current;

    if (directionLockRef.current === null) {
      directionLockRef.current = resolveSwipeDirection(deltaX, deltaY, DIRECTION_LOCK_THRESHOLD);
    }

    if (directionLockRef.current === null) {
      return;
    }

    if (directionLockRef.current !== 'horizontal') {
      return;
    }

    if (releaseScrollLockRef.current === null) {
      const activePanel = event.currentTarget.querySelector<HTMLElement>(`[data-tier-modal-panel="${activeTab}"]`);
      releaseScrollLockRef.current = lockSwipeScroll(
        activePanel ? [event.currentTarget, activePanel] : [event.currentTarget],
      );
    }

    shouldSuppressClickRef.current = true;

    if (event.cancelable) {
      event.preventDefault();
    }

    setDragOffset(deltaX);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - startXRef.current;
    const viewportWidth = viewportWidthRef.current || event.currentTarget.clientWidth;
    const swipeDirection =
      directionLockRef.current ?? resolveSwipeDirection(deltaX, event.clientY - startYRef.current, DIRECTION_LOCK_THRESHOLD);
    const shouldChangeTab =
      swipeDirection === 'horizontal' &&
      (Math.abs(deltaX) >= SWIPE_THRESHOLD || Math.abs(deltaX) >= viewportWidth * 0.18);

    setIsTrackAnimating(true);
    setDragOffset(0);

    if (shouldChangeTab) {
      const nextIndex = deltaX < 0 ? activeIndex + 1 : activeIndex - 1;
      const wrappedIndex = getWrappedTierModalIndex(nextIndex);
      const nextTrackIndex = deltaX < 0 && activeIndex === TIER_MODAL_TABS.length - 1 ? TIER_MODAL_TABS.length + 1 : deltaX > 0 && activeIndex === 0 ? 0 : wrappedIndex + 1;

      setActiveTab(TIER_MODAL_TABS[wrappedIndex].id);
      setTrackIndex(nextTrackIndex);
    }

    pointerIdRef.current = null;
    directionLockRef.current = null;
    releaseScrollLockRef.current?.();
    releaseScrollLockRef.current = null;
    releasePointerCapture(event.currentTarget, event.pointerId);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    releaseScrollLockRef.current?.();
    releaseScrollLockRef.current = null;
    releasePointerCapture(event.currentTarget, event.pointerId);
    pointerIdRef.current = null;
    directionLockRef.current = null;
    setDragOffset(0);
    setIsTrackAnimating(true);
  };

  const handleTrackTransitionEnd = () => {
    if (trackIndex === 0) {
      setIsTrackAnimating(false);
      setTrackIndex(TIER_MODAL_TABS.length);
      return;
    }

    if (trackIndex === TIER_MODAL_TABS.length + 1) {
      setIsTrackAnimating(false);
      setTrackIndex(1);
    }
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!shouldSuppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    shouldSuppressClickRef.current = false;
  };
  const slideWidth = Math.max(viewportWidth - TIER_MODAL_CAROUSEL_SIDE_PADDING * 2, 0);
  const slideSpan = slideWidth + TIER_MODAL_CAROUSEL_GAP;
  const trackTranslateX = TIER_MODAL_CAROUSEL_SIDE_PADDING - trackIndex * slideSpan + dragOffset;

  return createPortal(
    <div className="app-shell__modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-labelledby="game-dividend-modal-title"
        aria-modal="true"
        className="app-shell__modal app-shell__modal--dividend"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="app-shell__modal-header">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Highlight Tier</p>
            <h2 className="app-shell__section-title" id="game-dividend-modal-title">
              티어
            </h2>
          </div>
          <button
            aria-label="티어 모달 닫기"
            className="app-shell__modal-close"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>

        <div className="app-shell__modal-body">
          <div aria-label="티어 모달 탭" className="app-shell__tier-modal-tabs" role="tablist">
            {TIER_MODAL_TABS.map((tab) => (
              <button
                key={tab.id}
                aria-selected={activeTab === tab.id}
                className="app-shell__tier-modal-tab"
                data-active={activeTab === tab.id}
                onClick={() => handleSelectTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div
            ref={viewportRef}
            className="app-shell__tier-modal-carousel app-shell__swipeable-tab-panel"
            onClickCapture={handleClickCapture}
            onPointerCancel={handlePointerCancel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            role="tabpanel"
          >
            <div
              className="app-shell__tier-modal-track"
              data-animating={isTrackAnimating}
              onTransitionEnd={handleTrackTransitionEnd}
              style={{
                '--tier-modal-carousel-gap': `${TIER_MODAL_CAROUSEL_GAP}px`,
                '--tier-modal-carousel-side-padding': `${TIER_MODAL_CAROUSEL_SIDE_PADDING}px`,
                '--tier-modal-slide-width': `${slideWidth}px`,
                transform: `translateX(${trackTranslateX}px)`,
              } as CSSProperties}
            >
              {carouselTabs.map((tab, index) => (
                <div
                  key={`${tab.id}-${index}`}
                  aria-hidden={activeTab !== tab.id}
                  className="app-shell__tier-modal-slide"
                  data-active={activeTab === tab.id}
                >
                  <div
                    className="app-shell__tier-modal-panel"
                    data-tier-modal-panel={tab.id}
                  >
                    {tabPanels[tab.id]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>,
    container,
  );
}
