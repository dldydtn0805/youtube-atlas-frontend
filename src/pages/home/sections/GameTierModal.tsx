import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { GameTierProgress } from '../../../features/game/types';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useHeaderSwipeToClose from '../hooks/useHeaderSwipeToClose';
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

const TIER_MODAL_CAROUSEL_GAP = 0;
const TIER_MODAL_CAROUSEL_SIDE_PADDING = 0;

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
  const { backdropStyle, headerSwipeHandlers, modalStyle } = useHeaderSwipeToClose({
    disabled: !isOpen,
    onClose,
  });

  const [activeTab, setActiveTab] = useState<TierModalTab>(defaultTab);
  const [trackIndex, setTrackIndex] = useState(TIER_MODAL_TABS.findIndex((tab) => tab.id === defaultTab) + 1);
  const [isTrackAnimating, setIsTrackAnimating] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
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
      setIsTrackAnimating(false);
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
    setActiveTab(nextTab);
    setTrackIndex(nextIndex + 1);
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

  const slideWidth = Math.max(viewportWidth - TIER_MODAL_CAROUSEL_SIDE_PADDING * 2, 0);
  const slideSpan = slideWidth + TIER_MODAL_CAROUSEL_GAP;
  const trackTranslateX = TIER_MODAL_CAROUSEL_SIDE_PADDING - trackIndex * slideSpan;

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
            className="app-shell__tier-modal-carousel"
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
