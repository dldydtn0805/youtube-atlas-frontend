import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ChartPanel, CommunityPanel } from './ContentPanels';
import { FilterBar } from './FilterPanels';
import PlayerStage from './PlayerStage';
import { getFullscreenElement } from '../utils';
import './HomePlaybackSection.css';

const STICKY_SELECTED_VIDEO_TOP_OFFSET = 12;
const STICKY_SELECTED_VIDEO_RELEASE_GAP = 16;
const STICKY_SELECTED_VIDEO_COLLAPSED_STORAGE_KEY = 'youtube-atlas-sticky-selected-video-collapsed';

interface StickySelectedVideoControls {
  onScrollToTop: () => void;
  onToggleCollapse: () => void;
}

interface HomePlaybackSectionProps {
  chartPanelProps: ComponentProps<typeof ChartPanel>;
  communityPanelProps: ComponentProps<typeof CommunityPanel>;
  filterBarProps: ComponentProps<typeof FilterBar>;
  playerStageProps: Omit<ComponentProps<typeof PlayerStage>, 'chartContent' | 'filterContent'>;
  stickySelectedVideoContent?: ReactNode | ((controls: StickySelectedVideoControls) => ReactNode);
  stickySelectedVideoLabel?: string;
}

function getCinematicChartClassName(className?: string) {
  return className ? `${className} app-shell__panel--chart-cinematic` : 'app-shell__panel--chart-cinematic';
}

function getInitialStickySelectedVideoCollapsed() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(STICKY_SELECTED_VIDEO_COLLAPSED_STORAGE_KEY) === 'true';
}

export default function HomePlaybackSection({
  chartPanelProps,
  communityPanelProps,
  filterBarProps,
  playerStageProps,
  stickySelectedVideoContent,
  stickySelectedVideoLabel = 'Selected Video',
}: HomePlaybackSectionProps) {
  const [isStickySelectedVideoVisible, setIsStickySelectedVideoVisible] = useState(false);
  const [isStickySelectedVideoCollapsed, setIsStickySelectedVideoCollapsed] = useState(
    getInitialStickySelectedVideoCollapsed,
  );
  const stickySelectedVideoSlotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const playerViewport = playerStageProps.playerViewportRef.current;

    if (
      typeof window === 'undefined' ||
      !playerViewport ||
      !stickySelectedVideoContent
    ) {
      setIsStickySelectedVideoVisible(false);
      return;
    }

    let animationFrameId: number | null = null;

    const syncStickyVisibility = (playerViewportBottom: number) => {
      setIsStickySelectedVideoVisible((currentValue) => {
        const releaseThreshold =
          STICKY_SELECTED_VIDEO_TOP_OFFSET +
          (currentValue
            ? (stickySelectedVideoSlotRef.current?.offsetHeight ?? 0) + STICKY_SELECTED_VIDEO_RELEASE_GAP
            : 0);
        const nextIsVisible = playerViewportBottom <= releaseThreshold;

        return currentValue === nextIsVisible ? currentValue : nextIsVisible;
      });
    };

    const updateStickyVisibility = () => {
      animationFrameId = null;
      syncStickyVisibility(playerViewport.getBoundingClientRect().bottom);
    };

    const scheduleStickyVisibilityUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateStickyVisibility);
    };

    scheduleStickyVisibilityUpdate();

    const observer = new IntersectionObserver(
      ([entry]) => {
        syncStickyVisibility(entry.boundingClientRect.bottom);
      },
      {
        threshold: 0,
      },
    );

    observer.observe(playerViewport);
    window.addEventListener('resize', scheduleStickyVisibilityUpdate);
    window.addEventListener('scroll', scheduleStickyVisibilityUpdate, { passive: true });

    return () => {
      observer.disconnect();
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', scheduleStickyVisibilityUpdate);
      window.removeEventListener('scroll', scheduleStickyVisibilityUpdate);
    };
  }, [
    playerStageProps.playerViewportRef,
    stickySelectedVideoContent,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      STICKY_SELECTED_VIDEO_COLLAPSED_STORAGE_KEY,
      isStickySelectedVideoCollapsed ? 'true' : 'false',
    );
  }, [isStickySelectedVideoCollapsed]);

  const handleScrollToTop = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const fullscreenElement = getFullscreenElement();

    if (fullscreenElement instanceof HTMLElement) {
      if (typeof fullscreenElement.scrollTo === 'function') {
        fullscreenElement.scrollTo({
          behavior: 'smooth',
          top: 0,
        });
      } else {
        fullscreenElement.scrollTop = 0;
      }
    }

    window.scrollTo({
      behavior: 'smooth',
      top: 0,
    });
  };
  const renderedStickySelectedVideoContent =
    typeof stickySelectedVideoContent === 'function'
      ? stickySelectedVideoContent({
          onScrollToTop: handleScrollToTop,
          onToggleCollapse: () => setIsStickySelectedVideoCollapsed(true),
        })
      : stickySelectedVideoContent;
  const stickySelectedVideoSlot =
    stickySelectedVideoContent && isStickySelectedVideoVisible ? (
      <div ref={stickySelectedVideoSlotRef} className="app-shell__sticky-selected-video-slot">
        <div className="app-shell__sticky-selected-video-frame">
          {isStickySelectedVideoCollapsed ? (
            <div className="app-shell__game-panel-actions app-shell__game-panel-actions--collapsed">
              <div
                aria-expanded="false"
                className="app-shell__game-panel-actions-header"
                data-clickable="true"
                onClick={() => setIsStickySelectedVideoCollapsed(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setIsStickySelectedVideoCollapsed(false);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <p className="app-shell__game-panel-actions-eyebrow">{stickySelectedVideoLabel}</p>
                <div
                  className="app-shell__game-panel-actions-utility"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <button
                    aria-expanded="false"
                    aria-label="선택한 영상 패널 펼치기"
                    className="app-shell__game-panel-action-utility"
                    onClick={() => setIsStickySelectedVideoCollapsed(false)}
                    title="펼치기"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M12 6v12M6 12h12"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </button>
                  <button
                    aria-label="선택한 영상 패널을 맨 위로 이동"
                    className="app-shell__game-panel-action-utility"
                    onClick={handleScrollToTop}
                    title="맨 위로"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M7.5 14.5 12 10l4.5 4.5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            renderedStickySelectedVideoContent
          )}
        </div>
      </div>
    ) : null;

  const renderFilterBar = () => <FilterBar {...filterBarProps} />;
  const renderChartPanel = (isCinematic = false) => (
    <ChartPanel
      {...chartPanelProps}
      className={isCinematic ? getCinematicChartClassName(chartPanelProps.className) : chartPanelProps.className}
    />
  );

  return (
    <>
      {!playerStageProps.isCinematicModeActive ? stickySelectedVideoSlot : null}
      <PlayerStage
        {...playerStageProps}
        chartContent={renderChartPanel(true)}
        filterContent={renderFilterBar()}
        topContent={playerStageProps.isCinematicModeActive ? stickySelectedVideoSlot : null}
      />
      {!playerStageProps.isCinematicModeActive ? renderFilterBar() : null}
      {!playerStageProps.isCinematicModeActive ? renderChartPanel() : null}
      <CommunityPanel {...communityPanelProps} />
    </>
  );
}
