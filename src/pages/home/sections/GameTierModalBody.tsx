import { memo, type CSSProperties, type HTMLAttributes, type ReactNode, type RefObject } from 'react';
import {
  TIER_MODAL_CAROUSEL_GAP,
  TIER_MODAL_CAROUSEL_SIDE_PADDING,
  TIER_MODAL_TABS,
  type TierModalTab,
  type TierModalTabItem,
} from './gameTierModalTabs';

interface GameTierModalBodyProps {
  activeTab: TierModalTab;
  bodySwipeHandlers?: HTMLAttributes<HTMLDivElement>;
  carouselTabs: ReadonlyArray<TierModalTabItem>;
  isTrackAnimating: boolean;
  onSelectTab: (tab: TierModalTab) => void;
  onTrackTransitionEnd: () => void;
  renderedTabs: ReadonlySet<TierModalTab>;
  slideWidth: number;
  tabPanels: Record<TierModalTab, ReactNode>;
  trackTranslateX: number;
  viewportRef: RefObject<HTMLDivElement | null>;
}

const GameTierModalBody = memo(function GameTierModalBody({
  activeTab,
  bodySwipeHandlers,
  carouselTabs,
  isTrackAnimating,
  onSelectTab,
  onTrackTransitionEnd,
  renderedTabs,
  slideWidth,
  tabPanels,
  trackTranslateX,
  viewportRef,
}: GameTierModalBodyProps) {
  return (
    <div className="app-shell__modal-body" {...bodySwipeHandlers}>
      <div aria-label="티어 모달 탭" className="app-shell__tier-modal-tabs" role="tablist">
        {TIER_MODAL_TABS.map((tab) => (
          <button
            key={tab.id}
            aria-selected={activeTab === tab.id}
            className="app-shell__tier-modal-tab"
            data-active={activeTab === tab.id}
            onClick={() => onSelectTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div ref={viewportRef} className="app-shell__tier-modal-carousel" role="tabpanel">
        <div
          className="app-shell__tier-modal-track"
          data-animating={isTrackAnimating}
          onTransitionEnd={(event) => {
            if (event.currentTarget === event.target) {
              onTrackTransitionEnd();
            }
          }}
          style={{
            '--tier-modal-carousel-gap': `${TIER_MODAL_CAROUSEL_GAP}px`,
            '--tier-modal-carousel-side-padding': `${TIER_MODAL_CAROUSEL_SIDE_PADDING}px`,
            '--tier-modal-slide-width': `${slideWidth}px`,
            transform: `translate3d(${trackTranslateX}px, 0, 0)`,
          } as CSSProperties}
        >
          {carouselTabs.map((tab, index) => (
            <div
              key={`${tab.id}-${index}`}
              aria-hidden={activeTab !== tab.id}
              className="app-shell__tier-modal-slide"
              data-active={activeTab === tab.id}
            >
              <div className="app-shell__tier-modal-panel" data-tier-modal-panel={tab.id}>
                {renderedTabs.has(tab.id) ? tabPanels[tab.id] : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default GameTierModalBody;
