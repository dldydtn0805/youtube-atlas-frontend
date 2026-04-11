import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ChartPanel, CommunityPanel } from './ContentPanels';
import { FilterBar } from './FilterPanels';
import PlayerStage from './PlayerStage';
import './HomePlaybackSection.css';

const STICKY_SELECTED_VIDEO_TOP_OFFSET = 12;
const STICKY_SELECTED_VIDEO_RELEASE_GAP = 16;

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

export default function HomePlaybackSection({
  chartPanelProps,
  communityPanelProps,
  filterBarProps,
  playerStageProps,
  stickySelectedVideoContent,
  stickySelectedVideoLabel = 'Selected Video',
}: HomePlaybackSectionProps) {
  const [isStickySelectedVideoVisible, setIsStickySelectedVideoVisible] = useState(false);
  const [isStickySelectedVideoCollapsed, setIsStickySelectedVideoCollapsed] = useState(false);
  const stickySelectedVideoSlotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const playerViewport = playerStageProps.playerViewportRef.current;

    if (
      typeof window === 'undefined' ||
      !playerViewport ||
      !stickySelectedVideoContent ||
      playerStageProps.isCinematicModeActive
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
    playerStageProps.isCinematicModeActive,
    playerStageProps.playerViewportRef,
    stickySelectedVideoContent,
  ]);

  useEffect(() => {
    if (!isStickySelectedVideoVisible) {
      setIsStickySelectedVideoCollapsed(false);
    }
  }, [isStickySelectedVideoVisible]);

  const handleScrollToTop = () => {
    if (typeof window === 'undefined') {
      return;
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

  const renderFilterBar = () => <FilterBar {...filterBarProps} />;
  const renderChartPanel = (isCinematic = false) => (
    <ChartPanel
      {...chartPanelProps}
      className={isCinematic ? getCinematicChartClassName(chartPanelProps.className) : chartPanelProps.className}
    />
  );

  return (
    <>
      {stickySelectedVideoContent && !playerStageProps.isCinematicModeActive && isStickySelectedVideoVisible ? (
        <div ref={stickySelectedVideoSlotRef} className="app-shell__sticky-selected-video-slot">
          <div className="app-shell__sticky-selected-video-frame">
            {isStickySelectedVideoCollapsed ? (
              <div className="app-shell__game-panel-actions app-shell__game-panel-actions--collapsed">
                <div className="app-shell__game-panel-actions-header">
                  <p className="app-shell__game-panel-actions-eyebrow">{stickySelectedVideoLabel}</p>
                  <div className="app-shell__game-panel-actions-utility">
                  <button
                    aria-label="선택한 영상 패널을 맨 위로 이동"
                    className="app-shell__game-panel-action-utility"
                    onClick={handleScrollToTop}
                    title="맨 위로"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M12 18V6M12 6l-4 4M12 6l4 4"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </button>
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
                  </div>
                </div>
              </div>
            ) : (
              renderedStickySelectedVideoContent
            )}
          </div>
        </div>
      ) : null}
      <PlayerStage
        {...playerStageProps}
        chartContent={renderChartPanel(true)}
        filterContent={renderFilterBar()}
      />
      {!playerStageProps.isCinematicModeActive ? renderFilterBar() : null}
      {!playerStageProps.isCinematicModeActive ? renderChartPanel() : null}
      <CommunityPanel {...communityPanelProps} />
    </>
  );
}
