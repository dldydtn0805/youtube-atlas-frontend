import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { GameTierProgress } from '../../../features/game/types';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useHeaderSwipeToClose from '../hooks/useHeaderSwipeToClose';
import { getFullscreenElement } from '../utils';
import GameTierModalBody from './GameTierModalBody';
import GameTierModalTierPanel from './GameTierModalTierPanel';
import GameTierCriteriaPanel from './GameTierCriteriaPanel';
import {
  TIER_MODAL_CAROUSEL_GAP,
  TIER_MODAL_CAROUSEL_SIDE_PADDING,
  TIER_MODAL_TABS,
  getTierModalTabIndex,
  getTierModalTabsBetween,
  type TierModalTab,
} from './gameTierModalTabs';
import './GameTierModal.css';

interface GameTierModalProps {
  defaultTab?: TierModalTab;
  highlightsContent?: ReactNode;
  isOpen: boolean;
  isTierProgressLoading?: boolean;
  onClose: () => void;
  rankingContent?: ReactNode;
  tierProgress?: GameTierProgress;
}

export type { TierModalTab } from './gameTierModalTabs';

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
  const { backdropStyle, bodySwipeHandlers, headerSwipeHandlers, modalStyle } = useHeaderSwipeToClose({
    disabled: !isOpen,
    onClose,
  });

  const [activeTab, setActiveTab] = useState<TierModalTab>(defaultTab);
  const [trackIndex, setTrackIndex] = useState(getTierModalTabIndex(defaultTab));
  const [isTrackAnimating, setIsTrackAnimating] = useState(false);
  const [renderedTabs, setRenderedTabs] = useState<ReadonlySet<TierModalTab>>(() => new Set([defaultTab]));
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const tierPanelContent = useMemo(
    () => (
      <GameTierModalTierPanel
        isTierProgressLoading={isTierProgressLoading}
        tierProgress={tierProgress}
      />
    ),
    [isTierProgressLoading, tierProgress],
  );

  const tabPanels = useMemo<Record<TierModalTab, ReactNode>>(
    () => ({
      criteria: <GameTierCriteriaPanel />,
      highlights: highlightsContent ?? (
        <p className="app-shell__game-empty app-shell__tier-modal-empty-state">하이라이트가 없습니다.</p>
      ),
      ranking: rankingContent ?? <p className="app-shell__game-empty">랭킹 정보를 불러올 수 없습니다.</p>,
      tier: tierPanelContent,
    }),
    [highlightsContent, rankingContent, tierPanelContent],
  );

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setTrackIndex(getTierModalTabIndex(defaultTab));
      setIsTrackAnimating(false);
      setRenderedTabs(new Set([defaultTab]));
    }
  }, [defaultTab, isOpen]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || typeof window === 'undefined') {
      return;
    }

    const syncViewportWidth = () => {
      setViewportWidth(viewport.clientWidth);
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

  const handleSelectTab = useCallback((nextTab: TierModalTab) => {
    const nextIndex = getTierModalTabIndex(nextTab);

    if (nextIndex < 0 || nextTab === activeTab) {
      return;
    }

    setRenderedTabs(new Set(getTierModalTabsBetween(activeTab, nextTab)));
    setIsTrackAnimating(true);
    setActiveTab(nextTab);
    setTrackIndex(nextIndex);
  }, [activeTab]);

  const handleTrackTransitionEnd = useCallback(() => {
    setIsTrackAnimating(false);
    setRenderedTabs(new Set([activeTab]));
  }, [activeTab]);

  const slideWidth = Math.max(viewportWidth - TIER_MODAL_CAROUSEL_SIDE_PADDING * 2, 0);
  const slideSpan = slideWidth + TIER_MODAL_CAROUSEL_GAP;
  const trackTranslateX = TIER_MODAL_CAROUSEL_SIDE_PADDING - trackIndex * slideSpan;

  if (
    !isOpen ||
    typeof document === 'undefined' ||
    (!tierProgress && !isTierProgressLoading && !rankingContent && !highlightsContent)
  ) {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;

  return createPortal(
    <div
      className="app-shell__modal-backdrop app-shell__modal-backdrop--dividend"
      onClick={onClose}
      role="presentation"
      style={backdropStyle}
    >
      <section
        aria-labelledby="game-dividend-modal-title"
        aria-modal="true"
        className="app-shell__modal app-shell__modal--dividend"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={modalStyle}
      >
        <div className="app-shell__modal-header app-shell__modal-header--swipe-close" {...headerSwipeHandlers}>
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

        <GameTierModalBody
          activeTab={activeTab}
          bodySwipeHandlers={bodySwipeHandlers}
          carouselTabs={TIER_MODAL_TABS}
          isTrackAnimating={isTrackAnimating}
          onSelectTab={handleSelectTab}
          onTrackTransitionEnd={handleTrackTransitionEnd}
          renderedTabs={renderedTabs}
          slideWidth={slideWidth}
          tabPanels={tabPanels}
          trackTranslateX={trackTranslateX}
          viewportRef={viewportRef}
        />
      </section>
    </div>,
    container,
  );
}
