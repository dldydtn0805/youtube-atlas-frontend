import { useEffect, useRef, useState, type CSSProperties, type ComponentProps, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import CommentSection from '../../../components/CommentSection/CommentSection';
import { ChartPanel } from './ContentPanels';
import type { FilterBarProps } from './FilterPanels';
import PlayerStage, { PlayerStageHeader, PlayerViewportContent } from './PlayerStage';
import StickySelectedVideoHeaderCopy from './StickySelectedVideoHeaderCopy';
import StickySelectedVideoControls from './StickySelectedVideoControls';
import { getFullscreenElement } from '../utils';
import useMobileStickyAutoHide from './useMobileStickyAutoHide';
import './HomePlaybackSection.css';

const STICKY_SELECTED_VIDEO_TOP_OFFSET = 12;
const STICKY_SELECTED_VIDEO_COLLAPSED_STORAGE_KEY = 'youtube-atlas-sticky-selected-video-collapsed';
export const MOBILE_PLAYER_STAGE_STICKY_ENABLED_STORAGE_KEY = 'youtube-atlas-mobile-player-stage-sticky-enabled';
const MOBILE_STICKY_BOTTOM_OFFSET_CSS_VAR = '--app-mobile-visual-viewport-bottom-offset';

interface StickySelectedVideoControls {
  isDesktopPlayerDockActive: boolean;
  desktopPlayerDockSlotRef?: RefObject<HTMLDivElement | null>;
  isMobilePlayerStageStickyEnabled: boolean;
  isDesktopPlayerDockEnabled: boolean;
  onJumpToTop: () => void;
  onScrollToTop: () => void;
  onToggleMobilePlayerStageStickyEnabled: () => void;
  onToggleCollapse: () => void;
}

interface HomePlaybackSectionProps {
  chartPanelProps: Omit<
    ComponentProps<typeof ChartPanel>,
    'onOpenRegionModal' | 'onSelectView' | 'selectedViewId' | 'viewOptions'
  >;
  communityPanelProps: ComponentProps<typeof CommentSection>;
  filterBarProps: FilterBarProps;
  isStickySelectedVideoPlaybackPaused?: boolean;
  onPauseStickySelectedVideo?: () => void;
  onPlayNextStickySelectedVideo?: () => void;
  onPlayPreviousStickySelectedVideo?: () => void;
  onResumeStickySelectedVideo?: () => void;
  playerStageProps: Omit<ComponentProps<typeof PlayerStage>, 'chartContent' | 'filterContent'>;
  stickySelectedVideoContent?: ReactNode | ((controls: StickySelectedVideoControls) => ReactNode);
  stickySelectedVideoLabel?: string;
}

function getCinematicChartClassName(className?: string) {
  return className ? `${className} app-shell__panel--chart-cinematic` : 'app-shell__panel--chart-cinematic';
}

function getInitialStickySelectedVideoCollapsed(isMobileLayout: boolean) {
  if (typeof window === 'undefined') {
    return true;
  }

  if (!isMobileLayout) {
    return true;
  }

  const storedValue = window.localStorage.getItem(STICKY_SELECTED_VIDEO_COLLAPSED_STORAGE_KEY);

  return storedValue !== 'false';
}

function getInitialMobilePlayerStageStickyEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }

  const storedValue = window.localStorage.getItem(MOBILE_PLAYER_STAGE_STICKY_ENABLED_STORAGE_KEY);

  return storedValue === 'true';
}

export default function HomePlaybackSection({
  chartPanelProps,
  communityPanelProps,
  filterBarProps,
  isStickySelectedVideoPlaybackPaused = false,
  onPauseStickySelectedVideo,
  onPlayNextStickySelectedVideo,
  onPlayPreviousStickySelectedVideo,
  onResumeStickySelectedVideo,
  playerStageProps,
  stickySelectedVideoContent,
  stickySelectedVideoLabel = 'Now Playing',
}: HomePlaybackSectionProps) {
  const {
    supplementalContent,
    ...playerStageCoreProps
  } = playerStageProps;
  const [isStickySelectedVideoVisible, setIsStickySelectedVideoVisible] = useState(false);
  const [isDesktopPlayerDockActive, setIsDesktopPlayerDockActive] = useState(false);
  const [isStickySelectedVideoCollapsed, setIsStickySelectedVideoCollapsed] = useState(
    () => getInitialStickySelectedVideoCollapsed(playerStageProps.isMobileLayout),
  );
  const [isMobilePlayerStageStickyEnabled, setIsMobilePlayerStageStickyEnabled] = useState(
    getInitialMobilePlayerStageStickyEnabled,
  );
  const lastSelectedVideoIdRef = useRef<string | undefined>(playerStageProps.selectedVideoId);
  const desktopPlayerDockSlotRef = useRef<HTMLDivElement | null>(null);
  const [desktopDockStyle, setDesktopDockStyle] = useState<{
    dockHeight: number;
    height: number;
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const [mobileStickyBottomOffset, setMobileStickyBottomOffset] = useState(0);
  const isMobileStickySelectedVideoScrollHidden = useMobileStickyAutoHide(
    playerStageProps.isMobileLayout &&
      !playerStageProps.isCinematicModeActive &&
      Boolean(stickySelectedVideoContent) &&
      isStickySelectedVideoVisible,
  );

  useEffect(() => {
    if (!playerStageProps.isCinematicModeActive) {
      setIsStickySelectedVideoVisible(Boolean(stickySelectedVideoContent));
      return;
    }

    const playerViewport = playerStageProps.playerViewportRef.current;
    const playerStage = playerStageProps.playerStageRef.current;

    if (
      typeof window === 'undefined' ||
      !playerViewport ||
      !stickySelectedVideoContent
    ) {
      setIsStickySelectedVideoVisible(false);
      return;
    }

    let animationFrameId: number | null = null;
    const fullscreenElement = getFullscreenElement();
    const scrollTargets: Array<HTMLElement | Window> = [];

    scrollTargets.push(window);

    if (playerStage instanceof HTMLElement && !scrollTargets.includes(playerStage)) {
      scrollTargets.push(playerStage);
    }

    if (fullscreenElement instanceof HTMLElement && !scrollTargets.includes(fullscreenElement)) {
      scrollTargets.push(fullscreenElement);
    }

    const syncStickyVisibility = () => {
      setIsStickySelectedVideoVisible((currentValue) => {
        const playerViewportRect = playerViewport.getBoundingClientRect();
        const nextIsVisible = playerViewportRect.bottom <= STICKY_SELECTED_VIDEO_TOP_OFFSET;

        return currentValue === nextIsVisible ? currentValue : nextIsVisible;
      });
    };

    const updateStickyVisibility = () => {
      animationFrameId = null;
      syncStickyVisibility();
    };

    const scheduleStickyVisibilityUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateStickyVisibility);
    };

    scheduleStickyVisibilityUpdate();
    window.addEventListener('resize', scheduleStickyVisibilityUpdate);
    scrollTargets.forEach((target) => {
      target.addEventListener('scroll', scheduleStickyVisibilityUpdate, { passive: true });
    });

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', scheduleStickyVisibilityUpdate);
      scrollTargets.forEach((target) => {
        target.removeEventListener('scroll', scheduleStickyVisibilityUpdate);
      });
    };
  }, [
    playerStageProps.isCinematicModeActive,
    playerStageProps.playerStageRef,
    playerStageProps.playerViewportRef,
    stickySelectedVideoContent,
  ]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      playerStageProps.isMobileLayout ||
      !playerStageProps.selectedVideoId ||
      !stickySelectedVideoContent
    ) {
      setIsDesktopPlayerDockActive(false);
      return;
    }

    const playerViewport = playerStageProps.playerViewportRef.current;
    const playerStage = playerStageProps.playerStageRef.current;

    if (!playerViewport) {
      setIsDesktopPlayerDockActive(false);
      return;
    }

    let animationFrameId: number | null = null;
    const fullscreenElement = getFullscreenElement();
    const scrollTargets: Array<HTMLElement | Window> = [window];

    if (playerStage instanceof HTMLElement && !scrollTargets.includes(playerStage)) {
      scrollTargets.push(playerStage);
    }

    if (fullscreenElement instanceof HTMLElement && !scrollTargets.includes(fullscreenElement)) {
      scrollTargets.push(fullscreenElement);
    }

    const syncDesktopDockVisibility = () => {
      setIsDesktopPlayerDockActive((currentValue) => {
        const playerViewportRect = playerViewport.getBoundingClientRect();
        const nextIsVisible = playerViewportRect.bottom <= STICKY_SELECTED_VIDEO_TOP_OFFSET;

        return currentValue === nextIsVisible ? currentValue : nextIsVisible;
      });
    };

    const updateDesktopDockVisibility = () => {
      animationFrameId = null;
      syncDesktopDockVisibility();
    };

    const scheduleDesktopDockVisibilityUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateDesktopDockVisibility);
    };

    scheduleDesktopDockVisibilityUpdate();
    window.addEventListener('resize', scheduleDesktopDockVisibilityUpdate);
    scrollTargets.forEach((target) => {
      target.addEventListener('scroll', scheduleDesktopDockVisibilityUpdate, { passive: true });
    });

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener('resize', scheduleDesktopDockVisibilityUpdate);
      scrollTargets.forEach((target) => {
        target.removeEventListener('scroll', scheduleDesktopDockVisibilityUpdate);
      });
    };
  }, [
    playerStageProps.isMobileLayout,
    playerStageProps.playerStageRef,
    playerStageProps.playerViewportRef,
    playerStageProps.selectedVideoId,
    stickySelectedVideoContent,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || !playerStageProps.isMobileLayout) {
      setMobileStickyBottomOffset(0);
      return;
    }

    let animationFrameId: number | null = null;
    const visualViewport = window.visualViewport;

    const syncMobileStickyBottomOffset = () => {
      const nextOffset = visualViewport
        ? Math.max(0, Math.round(window.innerHeight - visualViewport.height - visualViewport.offsetTop))
        : 0;

      setMobileStickyBottomOffset((currentOffset) => (
        currentOffset === nextOffset ? currentOffset : nextOffset
      ));
    };

    const updateMobileStickyBottomOffset = () => {
      animationFrameId = null;
      syncMobileStickyBottomOffset();
    };

    const scheduleMobileStickyBottomOffsetUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateMobileStickyBottomOffset);
    };

    scheduleMobileStickyBottomOffsetUpdate();
    window.addEventListener('resize', scheduleMobileStickyBottomOffsetUpdate);
    visualViewport?.addEventListener('resize', scheduleMobileStickyBottomOffsetUpdate);
    visualViewport?.addEventListener('scroll', scheduleMobileStickyBottomOffsetUpdate);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener('resize', scheduleMobileStickyBottomOffsetUpdate);
      visualViewport?.removeEventListener('resize', scheduleMobileStickyBottomOffsetUpdate);
      visualViewport?.removeEventListener('scroll', scheduleMobileStickyBottomOffsetUpdate);
    };
  }, [playerStageProps.isMobileLayout]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      STICKY_SELECTED_VIDEO_COLLAPSED_STORAGE_KEY,
      isStickySelectedVideoCollapsed ? 'true' : 'false',
    );
  }, [isStickySelectedVideoCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      MOBILE_PLAYER_STAGE_STICKY_ENABLED_STORAGE_KEY,
      isMobilePlayerStageStickyEnabled ? 'true' : 'false',
    );
  }, [isMobilePlayerStageStickyEnabled]);

  useEffect(() => {
    if (playerStageProps.isMobileLayout) {
      return;
    }

    setIsStickySelectedVideoCollapsed(true);
  }, [playerStageProps.isMobileLayout]);

  useEffect(() => {
    const previousSelectedVideoId = lastSelectedVideoIdRef.current;
    lastSelectedVideoIdRef.current = playerStageProps.selectedVideoId;

    if (
      !playerStageProps.isMobileLayout ||
      isMobilePlayerStageStickyEnabled ||
      !playerStageProps.selectedVideoId ||
      playerStageProps.selectedVideoId === previousSelectedVideoId
    ) {
      return;
    }

    handleJumpToTop();

    const animationFrameId = window.requestAnimationFrame(handleJumpToTop);
    const timeoutId = window.setTimeout(handleJumpToTop, 80);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [
    isMobilePlayerStageStickyEnabled,
    playerStageProps.isMobileLayout,
    playerStageProps.selectedVideoId,
  ]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      playerStageProps.isMobileLayout ||
      !playerStageProps.selectedVideoId ||
      !isDesktopPlayerDockActive ||
      !stickySelectedVideoContent
    ) {
      setDesktopDockStyle(null);
      return;
    }

    let animationFrameId: number | null = null;
    const playerViewport = playerStageProps.playerViewportRef.current;
    const fullscreenElement = getFullscreenElement();
    const scrollTarget: HTMLElement | Window =
      fullscreenElement instanceof HTMLElement ? fullscreenElement : window;

    if (!playerViewport) {
      setDesktopDockStyle(null);
      return;
    }

    const syncDesktopDockStyle = () => {
      const dockSlot = desktopPlayerDockSlotRef.current;

      if (!dockSlot) {
        setDesktopDockStyle(null);
        return;
      }

      const dockRect = dockSlot.getBoundingClientRect();
      const viewportRect = playerViewport.getBoundingClientRect();

      if (dockRect.width <= 0 || dockRect.height <= 0 || viewportRect.height <= 0) {
        setDesktopDockStyle(null);
        return;
      }

      setDesktopDockStyle((currentStyle) => {
        const nextStyle = {
          dockHeight: dockRect.height,
          height: viewportRect.height,
          left: dockRect.left,
          top: dockRect.top,
          width: dockRect.width,
        };

        return currentStyle &&
          currentStyle.dockHeight === nextStyle.dockHeight &&
          currentStyle.height === nextStyle.height &&
          currentStyle.left === nextStyle.left &&
          currentStyle.top === nextStyle.top &&
          currentStyle.width === nextStyle.width
          ? currentStyle
          : nextStyle;
      });
    };

    const updateDesktopDockStyle = () => {
      animationFrameId = null;
      syncDesktopDockStyle();
    };

    const scheduleDesktopDockStyleUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateDesktopDockStyle);
    };

    scheduleDesktopDockStyleUpdate();
    window.addEventListener('resize', scheduleDesktopDockStyleUpdate);
    scrollTarget.addEventListener('scroll', scheduleDesktopDockStyleUpdate, { passive: true });

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener('resize', scheduleDesktopDockStyleUpdate);
      scrollTarget.removeEventListener('scroll', scheduleDesktopDockStyleUpdate);
    };
  }, [
    isDesktopPlayerDockActive,
    isStickySelectedVideoCollapsed,
    playerStageProps.isMobileLayout,
    playerStageProps.playerStageRef,
    playerStageProps.playerViewportRef,
    playerStageProps.selectedVideoId,
    stickySelectedVideoContent,
  ]);

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

  const handleJumpToTop = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const fullscreenElement = getFullscreenElement();

    if (fullscreenElement instanceof HTMLElement) {
      if (typeof fullscreenElement.scrollTo === 'function') {
        fullscreenElement.scrollTo({
          behavior: 'auto',
          top: 0,
        });
      } else {
        fullscreenElement.scrollTop = 0;
      }
    }

    window.scrollTo({
      behavior: 'auto',
      top: 0,
    });
  };

  const handleExpandStickySelectedVideo = () => {
    setIsStickySelectedVideoCollapsed(false);
  };

  const handleToggleMobilePlayerStageSticky = () => {
    setIsMobilePlayerStageStickyEnabled((currentValue) => !currentValue);
  };

  const handleCollapsedLabelClick = () => {
    handleScrollToTop();
  };

  const renderedStickySelectedVideoContent =
    typeof stickySelectedVideoContent === 'function'
      ? stickySelectedVideoContent({
          isDesktopPlayerDockActive: Boolean(desktopDockStyle),
          desktopPlayerDockSlotRef,
          isMobilePlayerStageStickyEnabled,
          isDesktopPlayerDockEnabled:
            !playerStageProps.isMobileLayout &&
            isDesktopPlayerDockActive &&
            Boolean(playerStageProps.selectedVideoId) &&
            isStickySelectedVideoVisible,
          onJumpToTop: handleJumpToTop,
          onScrollToTop: handleScrollToTop,
          onToggleMobilePlayerStageStickyEnabled: handleToggleMobilePlayerStageSticky,
          onToggleCollapse: () => {
            setIsStickySelectedVideoCollapsed(true);
          },
        })
      : stickySelectedVideoContent;

  const stickySelectedVideoSlot =
    stickySelectedVideoContent && isStickySelectedVideoVisible ? (
      <div
        className="app-shell__sticky-selected-video-slot"
        data-cinematic={playerStageProps.isCinematicModeActive}
        data-scroll-hidden={isMobileStickySelectedVideoScrollHidden ? 'true' : 'false'}
        style={
          playerStageProps.isMobileLayout
            ? ({
                [MOBILE_STICKY_BOTTOM_OFFSET_CSS_VAR]: `${mobileStickyBottomOffset}px`,
              } as CSSProperties)
            : undefined
        }
      >
        <div className="app-shell__sticky-selected-video-frame">
          {isStickySelectedVideoCollapsed ? (
            <div className="app-shell__game-panel-actions app-shell__game-panel-actions--collapsed">
              <div
                aria-expanded="false"
                className="app-shell__game-panel-actions-header"
                data-clickable="true"
                onClick={handleExpandStickySelectedVideo}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleExpandStickySelectedVideo();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <StickySelectedVideoHeaderCopy
                  label={stickySelectedVideoLabel}
                  onLabelClick={playerStageProps.isMobileLayout ? undefined : handleCollapsedLabelClick}
                  title={playerStageProps.selectedVideoTitle}
                />
                <div
                  className="app-shell__game-panel-actions-utility"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <StickySelectedVideoControls
                    isMobileLayout={playerStageProps.isMobileLayout}
                    isMobilePlayerStageStickyEnabled={playerStageProps.isMobileLayout ? isMobilePlayerStageStickyEnabled : undefined}
                    isPlaybackPaused={isStickySelectedVideoPlaybackPaused}
                    onExpandPanel={handleExpandStickySelectedVideo}
                    onJumpToTop={handleJumpToTop}
                    onNextVideo={playerStageProps.selectedVideoId ? onPlayNextStickySelectedVideo : undefined}
                    onPauseVideo={playerStageProps.selectedVideoId ? onPauseStickySelectedVideo : undefined}
                    onPreviousVideo={playerStageProps.selectedVideoId ? onPlayPreviousStickySelectedVideo : undefined}
                    onResumeVideo={playerStageProps.selectedVideoId ? onResumeStickySelectedVideo : undefined}
                    onScrollToTop={handleScrollToTop}
                    onToggleMobilePlayerStageStickyEnabled={
                      playerStageProps.isMobileLayout ? handleToggleMobilePlayerStageSticky : undefined
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            renderedStickySelectedVideoContent
          )}
        </div>
      </div>
    ) : null;

  const renderChartPanel = (isCinematic = false) => (
    <ChartPanel
      {...chartPanelProps}
      className={isCinematic ? getCinematicChartClassName(chartPanelProps.className) : chartPanelProps.className}
      onOpenRegionModal={filterBarProps.onOpenRegionModal}
      onSelectView={filterBarProps.onSelectView}
      selectedViewId={filterBarProps.selectedViewId}
      viewOptions={filterBarProps.viewOptions}
    />
  );

  const fullscreenElement = typeof document === 'undefined' ? null : getFullscreenElement();
  const renderedStickySelectedVideoSlot =
    playerStageProps.isCinematicModeActive &&
    stickySelectedVideoSlot &&
    fullscreenElement instanceof HTMLElement
      ? createPortal(stickySelectedVideoSlot, fullscreenElement)
      : stickySelectedVideoSlot;
  const videoPlayerDockStyle: CSSProperties | undefined = desktopDockStyle
    ? {
        height: `${desktopDockStyle.dockHeight}px`,
        left: `${desktopDockStyle.left}px`,
        position: 'fixed',
        top: `${desktopDockStyle.top}px`,
        width: `${desktopDockStyle.width}px`,
      }
    : undefined;
  const playerViewportStyle: CSSProperties | undefined = desktopDockStyle
    ? { height: `${desktopDockStyle.height}px` }
    : undefined;
  const shouldRenderDetachedMobileViewport =
    playerStageProps.isMobileLayout && !playerStageProps.isCinematicModeActive;

  return (
    <>
      {renderedStickySelectedVideoSlot}
      {shouldRenderDetachedMobileViewport ? (
        <>
          <PlayerStageHeader
            authStatus={playerStageProps.authStatus}
            cinematicToggleLabel={playerStageProps.cinematicToggleLabel}
            currentTierCode={playerStageProps.currentTierCode}
            currentTierName={playerStageProps.currentTierName}
            headerSupplementalContent={playerStageProps.headerSupplementalContent}
            isCinematicModeActive={playerStageProps.isCinematicModeActive}
            isMobileLayout={playerStageProps.isMobileLayout}
            isOpenPositionLimitReached={playerStageProps.isOpenPositionLimitReached}
            openPositionCount={playerStageProps.openPositionCount}
            onOpenGameModal={playerStageProps.onOpenGameModal}
            onOpenRegionModal={playerStageProps.onOpenRegionModal}
            onOpenTierModal={playerStageProps.onOpenTierModal}
            onOpenWalletModal={playerStageProps.onOpenWalletModal}
            onOpenViewModal={playerStageProps.onOpenViewModal}
            onToggleCinematicMode={playerStageProps.onToggleCinematicMode}
            selectedCategoryLabel={playerStageProps.selectedCategoryLabel}
            selectedCountryName={playerStageProps.selectedCountryName}
            walletBalancePoints={playerStageProps.walletBalancePoints}
          />
          <div
            className="app-shell__mobile-player-stage-sticky-shell"
            data-sticky-enabled={isMobilePlayerStageStickyEnabled ? 'true' : 'false'}
          >
            <PlayerViewportContent
              canNavigateVideos={playerStageProps.canNavigateVideos}
              isChartLoading={playerStageProps.isChartLoading}
              isCinematicModeActive={playerStageProps.isCinematicModeActive}
              isMobileLayout={playerStageProps.isMobileLayout}
              isVideoPlayerDocked={Boolean(videoPlayerDockStyle)}
              onNextVideo={playerStageProps.onNextVideo}
              onPlaybackRestoreApplied={playerStageProps.onPlaybackRestoreApplied}
              onPlaybackStateChange={playerStageProps.onPlaybackStateChange}
              onPreviousVideo={playerStageProps.onPreviousVideo}
              playbackRestore={playerStageProps.playbackRestore}
              playerRef={playerStageProps.playerRef}
              playerViewportRef={playerStageProps.playerViewportRef}
              playerViewportStyle={playerViewportStyle}
              selectedVideoId={playerStageProps.selectedVideoId}
              videoPlayerDockStyle={videoPlayerDockStyle}
            />
          </div>
        </>
      ) : null}
      <PlayerStage
        {...playerStageCoreProps}
        chartContent={renderChartPanel(true)}
        communityContent={<CommentSection hideHeader {...communityPanelProps} />}
        currentTierCode={playerStageCoreProps.currentTierCode}
        filterContent={undefined}
        supplementalContent={undefined}
        isVideoPlayerDocked={Boolean(videoPlayerDockStyle)}
        renderHeaderInline={!shouldRenderDetachedMobileViewport}
        playerViewportStyle={playerViewportStyle}
        renderViewportInline={!shouldRenderDetachedMobileViewport}
        videoPlayerDockStyle={videoPlayerDockStyle}
      />
      {!playerStageProps.isCinematicModeActive ? renderChartPanel() : null}
      {supplementalContent}
    </>
  );
}
