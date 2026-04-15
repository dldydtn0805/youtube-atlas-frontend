import { useEffect, useRef, useState, type CSSProperties, type ComponentProps, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ChartPanel, CommunityPanel } from './ContentPanels';
import { FilterBar } from './FilterPanels';
import PlayerStage, { PlayerStageHeader, PlayerViewportContent } from './PlayerStage';
import StickySelectedVideoHeaderCopy from './StickySelectedVideoHeaderCopy';
import StickySelectedVideoControls from './StickySelectedVideoControls';
import { getFullscreenElement } from '../utils';
import './HomePlaybackSection.css';

const STICKY_SELECTED_VIDEO_TOP_OFFSET = 12;
const STICKY_SELECTED_VIDEO_COLLAPSED_STORAGE_KEY = 'youtube-atlas-sticky-selected-video-collapsed';
export const MOBILE_PLAYER_PREVIEW_ENABLED_STORAGE_KEY = 'youtube-atlas-mobile-player-preview-enabled';
export const MOBILE_PLAYER_STAGE_STICKY_ENABLED_STORAGE_KEY = 'youtube-atlas-mobile-player-stage-sticky-enabled';
const MOBILE_PLAYER_PREVIEW_LAYOUT_STORAGE_KEY = 'youtube-atlas-mobile-player-preview-layout';
const MOBILE_PLAYER_PREVIEW_MIN_WIDTH = 96;
const MOBILE_PLAYER_PREVIEW_DEFAULT_WIDTH = 360;
const MOBILE_PLAYER_PREVIEW_ASPECT_RATIO = 16 / 9;
const MOBILE_PLAYER_PREVIEW_MARGIN = 12;
const MOBILE_PLAYER_PREVIEW_RESIZE_EDGE = 18;

interface MobilePlayerPreviewLayout {
  width: number;
  x: number;
  y: number;
}

type MobilePlayerPreviewResizeDirection =
  | 'top-left'
  | 'top-right';

interface StickySelectedVideoControls {
  isDesktopPlayerDockActive: boolean;
  desktopPlayerDockSlotRef?: RefObject<HTMLDivElement | null>;
  isMobilePlayerStageStickyEnabled: boolean;
  isDesktopPlayerDockEnabled: boolean;
  isMobilePlayerPreviewEnabled: boolean;
  onJumpToTop: () => void;
  onShowMobilePlayerPreview: () => void;
  onScrollToTop: () => void;
  onToggleMobilePlayerStageStickyEnabled: () => void;
  onToggleMobilePlayerPreviewEnabled: () => void;
  onToggleCollapse: () => void;
}

interface HomePlaybackSectionProps {
  chartPanelProps: ComponentProps<typeof ChartPanel>;
  communityPanelProps: ComponentProps<typeof CommunityPanel>;
  filterBarProps: ComponentProps<typeof FilterBar>;
  isStickySelectedVideoPlaybackPaused?: boolean;
  onPauseStickySelectedVideo?: () => void;
  onPlayNextStickySelectedVideo?: () => void;
  onPlayPreviousStickySelectedVideo?: () => void;
  onResumeStickySelectedVideo?: () => void;
  playerStageProps: Omit<ComponentProps<typeof PlayerStage>, 'chartContent' | 'filterContent'>;
  preferredPreviewVideoId?: string;
  stickySelectedVideoContent?: ReactNode | ((controls: StickySelectedVideoControls) => ReactNode);
  stickySelectedVideoLabel?: string;
}

function getCinematicChartClassName(className?: string) {
  return className ? `${className} app-shell__panel--chart-cinematic` : 'app-shell__panel--chart-cinematic';
}

function getInitialStickySelectedVideoCollapsed() {
  if (typeof window === 'undefined') {
    return true;
  }

  const storedValue = window.localStorage.getItem(STICKY_SELECTED_VIDEO_COLLAPSED_STORAGE_KEY);

  return storedValue !== 'false';
}

function getInitialMobilePlayerPreviewEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(MOBILE_PLAYER_PREVIEW_ENABLED_STORAGE_KEY) === 'true';
}

function getInitialMobilePlayerStageStickyEnabled() {
  if (typeof window === 'undefined') {
    return true;
  }

  const storedValue = window.localStorage.getItem(MOBILE_PLAYER_STAGE_STICKY_ENABLED_STORAGE_KEY);

  return storedValue !== 'false';
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPreviewHeight(width: number) {
  return Math.round(width / MOBILE_PLAYER_PREVIEW_ASPECT_RATIO);
}

function getResizeDirection(
  offsetX: number,
  offsetY: number,
  width: number,
): MobilePlayerPreviewResizeDirection | null {
  const isLeft = offsetX <= MOBILE_PLAYER_PREVIEW_RESIZE_EDGE;
  const isRight = offsetX >= width - MOBILE_PLAYER_PREVIEW_RESIZE_EDGE;
  const isTop = offsetY <= MOBILE_PLAYER_PREVIEW_RESIZE_EDGE;

  if (isTop && isLeft) {
    return 'top-left';
  }

  if (isTop && isRight) {
    return 'top-right';
  }

  return null;
}

function clampMobilePlayerPreviewLayout(layout: MobilePlayerPreviewLayout) {
  if (typeof window === 'undefined') {
    return layout;
  }

  const maxWidth = Math.max(MOBILE_PLAYER_PREVIEW_MIN_WIDTH, window.innerWidth - (MOBILE_PLAYER_PREVIEW_MARGIN * 2));
  const width = clampValue(
    layout.width,
    MOBILE_PLAYER_PREVIEW_MIN_WIDTH,
    maxWidth,
  );
  const height = getPreviewHeight(width);
  const maxX = Math.max(MOBILE_PLAYER_PREVIEW_MARGIN, window.innerWidth - width - MOBILE_PLAYER_PREVIEW_MARGIN);
  const maxY = Math.max(MOBILE_PLAYER_PREVIEW_MARGIN, window.innerHeight - height - MOBILE_PLAYER_PREVIEW_MARGIN);

  return {
    width,
    x: clampValue(layout.x, MOBILE_PLAYER_PREVIEW_MARGIN, maxX),
    y: clampValue(layout.y, MOBILE_PLAYER_PREVIEW_MARGIN, maxY),
  };
}

function getDefaultMobilePlayerPreviewLayout() {
  if (typeof window === 'undefined') {
    return {
      width: MOBILE_PLAYER_PREVIEW_DEFAULT_WIDTH,
      x: MOBILE_PLAYER_PREVIEW_MARGIN,
      y: MOBILE_PLAYER_PREVIEW_MARGIN,
    };
  }

  const width = clampValue(
    MOBILE_PLAYER_PREVIEW_DEFAULT_WIDTH,
    MOBILE_PLAYER_PREVIEW_MIN_WIDTH,
    Math.max(MOBILE_PLAYER_PREVIEW_MIN_WIDTH, window.innerWidth - (MOBILE_PLAYER_PREVIEW_MARGIN * 2)),
  );

  return clampMobilePlayerPreviewLayout({
    width,
    x: MOBILE_PLAYER_PREVIEW_MARGIN,
    y: MOBILE_PLAYER_PREVIEW_MARGIN,
  });
}

function getStoredMobilePlayerPreviewLayout() {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedLayout = window.localStorage.getItem(MOBILE_PLAYER_PREVIEW_LAYOUT_STORAGE_KEY);

  if (!storedLayout) {
    return null;
  }

  try {
    const parsedLayout = JSON.parse(storedLayout) as Partial<MobilePlayerPreviewLayout>;

    if (
      typeof parsedLayout.width !== 'number' ||
      typeof parsedLayout.x !== 'number' ||
      typeof parsedLayout.y !== 'number'
    ) {
      return null;
    }

    return clampMobilePlayerPreviewLayout({
      width: parsedLayout.width,
      x: parsedLayout.x,
      y: parsedLayout.y,
    });
  } catch {
    return null;
  }
}

function getInitialMobilePlayerPreviewLayout() {
  return getStoredMobilePlayerPreviewLayout() ?? getDefaultMobilePlayerPreviewLayout();
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
  preferredPreviewVideoId,
  stickySelectedVideoContent,
  stickySelectedVideoLabel = 'Now Playing',
}: HomePlaybackSectionProps) {
  const [isStickySelectedVideoVisible, setIsStickySelectedVideoVisible] = useState(false);
  const [isDesktopPlayerDockActive, setIsDesktopPlayerDockActive] = useState(false);
  const [isStickySelectedVideoCollapsed, setIsStickySelectedVideoCollapsed] = useState(
    getInitialStickySelectedVideoCollapsed,
  );
  const [isMobilePlayerPreviewEnabled, setIsMobilePlayerPreviewEnabled] = useState(
    getInitialMobilePlayerPreviewEnabled,
  );
  const [isMobilePlayerStageStickyEnabled, setIsMobilePlayerStageStickyEnabled] = useState(
    getInitialMobilePlayerStageStickyEnabled,
  );
  const [isMobilePlayerPreviewCollapsed, setIsMobilePlayerPreviewCollapsed] = useState(false);
  const mobilePlayerPreviewVideoId = preferredPreviewVideoId ?? playerStageProps.selectedVideoId;
  const shouldMountStickyPlayerPreview =
    !playerStageProps.isCinematicModeActive &&
    playerStageProps.isMobileLayout &&
    Boolean(mobilePlayerPreviewVideoId);
  const shouldShowStickyPlayerPreview =
    shouldMountStickyPlayerPreview &&
    isMobilePlayerPreviewEnabled &&
    !isMobilePlayerPreviewCollapsed;
  const [mobilePlayerPreviewLayout, setMobilePlayerPreviewLayout] = useState(
    getInitialMobilePlayerPreviewLayout,
  );
  const desktopPlayerDockSlotRef = useRef<HTMLDivElement | null>(null);
  const mobilePlayerDockSlotRef = useRef<HTMLDivElement | null>(null);
  const [desktopDockStyle, setDesktopDockStyle] = useState<{
    dockHeight: number;
    height: number;
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const [mobileDockStyle, setMobileDockStyle] = useState<{
    height: number;
    left: number;
    top: number;
    viewportHeight: number;
    viewportLeft: number;
    viewportTop: number;
    viewportWidth: number;
    width: number;
  } | null>(null);
  const dragStateRef = useRef<
    | {
        frameHeightOffset: number;
        frameWidthOffset: number;
        mode: 'drag' | 'resize';
        originFrameHeight: number;
        originFrameWidth: number;
        resizeDirection?: MobilePlayerPreviewResizeDirection;
        originHeight: number;
        originPointerX: number;
        originPointerY: number;
        originX: number;
        originY: number;
        originWidth: number;
        pointerId: number;
      }
    | null
  >(null);

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
      MOBILE_PLAYER_PREVIEW_ENABLED_STORAGE_KEY,
      isMobilePlayerPreviewEnabled ? 'true' : 'false',
    );
  }, [isMobilePlayerPreviewEnabled]);

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
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      MOBILE_PLAYER_PREVIEW_LAYOUT_STORAGE_KEY,
      JSON.stringify(mobilePlayerPreviewLayout),
    );
  }, [mobilePlayerPreviewLayout]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncPreviewLayout = () => {
      setMobilePlayerPreviewLayout((currentLayout) => {
        const nextLayout = clampMobilePlayerPreviewLayout(currentLayout);

        return (
          nextLayout.width === currentLayout.width &&
          nextLayout.x === currentLayout.x &&
          nextLayout.y === currentLayout.y
        )
          ? currentLayout
          : nextLayout;
      });
    };

    window.addEventListener('resize', syncPreviewLayout);

    return () => {
      window.removeEventListener('resize', syncPreviewLayout);
    };
  }, []);

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

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !playerStageProps.isMobileLayout ||
      !shouldShowStickyPlayerPreview ||
      !playerStageProps.selectedVideoId
    ) {
      setMobileDockStyle(null);
      return;
    }

    let animationFrameId: number | null = null;

    const syncMobileDockStyle = () => {
      const dockSlot = mobilePlayerDockSlotRef.current;
      const playerViewport = playerStageProps.playerViewportRef.current;

      if (!dockSlot) {
        setMobileDockStyle(null);
        return;
      }

      const dockRect = dockSlot.getBoundingClientRect();
      const viewportRect = playerViewport?.getBoundingClientRect();

      if (dockRect.width <= 0 || dockRect.height <= 0) {
        setMobileDockStyle(null);
        return;
      }

      const viewportHeight =
        viewportRect && viewportRect.height > 0 ? viewportRect.height : dockRect.height;
      const viewportLeft = viewportRect?.left ?? dockRect.left;
      const viewportTop = viewportRect?.top ?? dockRect.top;
      const viewportWidth =
        viewportRect && viewportRect.width > 0 ? viewportRect.width : dockRect.width;

      setMobileDockStyle((currentStyle) => {
        const nextStyle = {
          height: dockRect.height,
          left: dockRect.left,
          top: dockRect.top,
          viewportHeight,
          viewportLeft,
          viewportTop,
          viewportWidth,
          width: dockRect.width,
        };

        return currentStyle &&
          currentStyle.height === nextStyle.height &&
          currentStyle.left === nextStyle.left &&
          currentStyle.top === nextStyle.top &&
          currentStyle.viewportHeight === nextStyle.viewportHeight &&
          currentStyle.viewportLeft === nextStyle.viewportLeft &&
          currentStyle.viewportTop === nextStyle.viewportTop &&
          currentStyle.viewportWidth === nextStyle.viewportWidth &&
          currentStyle.width === nextStyle.width
          ? currentStyle
          : nextStyle;
      });
    };

    const updateMobileDockStyle = () => {
      animationFrameId = null;
      syncMobileDockStyle();
    };

    const scheduleMobileDockStyleUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateMobileDockStyle);
    };

    scheduleMobileDockStyleUpdate();
    window.addEventListener('resize', scheduleMobileDockStyleUpdate);
    window.addEventListener('scroll', scheduleMobileDockStyleUpdate, { passive: true });

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener('resize', scheduleMobileDockStyleUpdate);
      window.removeEventListener('scroll', scheduleMobileDockStyleUpdate);
    };
  }, [
    mobilePlayerPreviewLayout,
    playerStageProps.isMobileLayout,
    playerStageProps.playerViewportRef,
    playerStageProps.selectedVideoId,
    shouldShowStickyPlayerPreview,
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

    if (isMobilePlayerPreviewEnabled) {
      setIsMobilePlayerPreviewCollapsed(false);
    }
  };

  const handleShowMobilePlayerPreview = () => {
    setIsMobilePlayerPreviewEnabled(true);
    setIsMobilePlayerPreviewCollapsed(false);
  };

  const handleToggleMobilePlayerPreview = () => {
    setIsMobilePlayerPreviewEnabled((currentValue) => !currentValue);
    setIsMobilePlayerPreviewCollapsed(false);
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
          isMobilePlayerPreviewEnabled,
          onJumpToTop: handleJumpToTop,
          onShowMobilePlayerPreview: handleShowMobilePlayerPreview,
          onScrollToTop: handleScrollToTop,
          onToggleMobilePlayerStageStickyEnabled: handleToggleMobilePlayerStageSticky,
          onToggleMobilePlayerPreviewEnabled: handleToggleMobilePlayerPreview,
          onToggleCollapse: () => {
            setIsStickySelectedVideoCollapsed(true);

            if (!playerStageProps.isMobileLayout) {
              setIsMobilePlayerPreviewCollapsed(true);
            }
          },
        })
      : stickySelectedVideoContent;
  const stickyPlayerPreview =
    shouldMountStickyPlayerPreview && mobilePlayerPreviewVideoId ? (
      <div
        className="app-shell__sticky-player-preview-shell"
        data-current-tier={chartPanelProps.currentTierCode}
        data-visible={shouldShowStickyPlayerPreview ? 'true' : 'false'}
        style={
          {
            '--sticky-player-preview-height': `${getPreviewHeight(mobilePlayerPreviewLayout.width)}px`,
            '--sticky-player-preview-width': `${mobilePlayerPreviewLayout.width}px`,
            left: `${mobilePlayerPreviewLayout.x}px`,
            top: `${mobilePlayerPreviewLayout.y}px`,
          } as CSSProperties
        }
        onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
          const eventTarget = event.target as HTMLElement;
          const dragLayer = eventTarget.closest('.app-shell__sticky-player-preview-drag-layer');
          const resizeHandle = eventTarget.closest<HTMLElement>('.app-shell__sticky-player-preview-resize-handle');
          const dockSlot = eventTarget.closest('.app-shell__sticky-player-preview-dock-slot');
          const previewFrame = eventTarget.closest<HTMLElement>('.app-shell__sticky-player-preview-frame');
          const previewShell = event.currentTarget;
          const previewRect = previewShell.getBoundingClientRect();
          const frameRect = previewFrame?.getBoundingClientRect() ?? previewRect;
          const handleDirection = resizeHandle?.dataset.resizeDirection as MobilePlayerPreviewResizeDirection | undefined;
          const resizeDirection = handleDirection ?? getResizeDirection(
            event.clientX - frameRect.left,
            event.clientY - frameRect.top,
            frameRect.width,
          );
          const canStartResize = Boolean(handleDirection);
          const canStartDrag = Boolean(dragLayer || (previewFrame && !dockSlot));

          if (!canStartResize && !canStartDrag && (!previewFrame || !resizeDirection)) {
            return;
          }

          dragStateRef.current = {
            frameHeightOffset: Math.max(0, frameRect.height - getPreviewHeight(mobilePlayerPreviewLayout.width)),
            frameWidthOffset: Math.max(0, frameRect.width - mobilePlayerPreviewLayout.width),
            mode: canStartResize || (resizeDirection && !canStartDrag) ? 'resize' : 'drag',
            originFrameHeight: frameRect.height,
            originFrameWidth: frameRect.width,
            resizeDirection: canStartResize || (resizeDirection && !canStartDrag) ? resizeDirection ?? undefined : undefined,
            originHeight: getPreviewHeight(mobilePlayerPreviewLayout.width),
            originPointerX: event.clientX,
            originPointerY: event.clientY,
            originWidth: mobilePlayerPreviewLayout.width,
            originX: mobilePlayerPreviewLayout.x,
            originY: mobilePlayerPreviewLayout.y,
            pointerId: event.pointerId,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event: ReactPointerEvent<HTMLDivElement>) => {
          const dragState = dragStateRef.current;

          if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
          }

          const deltaX = event.clientX - dragState.originPointerX;
          const deltaY = event.clientY - dragState.originPointerY;

          if (dragState.mode === 'drag') {
            setMobilePlayerPreviewLayout((currentLayout) =>
              clampMobilePlayerPreviewLayout({
                width: currentLayout.width,
                x: dragState.originX + deltaX,
                y: dragState.originY + deltaY,
              }),
            );

            return;
          }

          const originRight = dragState.originX + dragState.originFrameWidth;
          const originBottom = dragState.originY + dragState.originFrameHeight;
          const widthFromHeightDelta = (nextHeightDelta: number) =>
            dragState.originWidth + (nextHeightDelta * MOBILE_PLAYER_PREVIEW_ASPECT_RATIO);
          const resizeDirection = dragState.resizeDirection;

          if (!resizeDirection) {
            return;
          }

          let nextWidth = dragState.originWidth;
          let nextX = dragState.originX;
          let nextY = dragState.originY;

          switch (resizeDirection) {
            case 'top-left': {
              const widthByX = dragState.originWidth - deltaX;
              const widthByY = widthFromHeightDelta(-deltaY);
              nextWidth = Math.abs(widthByX - dragState.originWidth) >= Math.abs(widthByY - dragState.originWidth)
                ? widthByX
                : widthByY;
              break;
            }
            case 'top-right': {
              const widthByX = dragState.originWidth + deltaX;
              const widthByY = widthFromHeightDelta(-deltaY);
              nextWidth = Math.abs(widthByX - dragState.originWidth) >= Math.abs(widthByY - dragState.originWidth)
                ? widthByX
                : widthByY;
              break;
            }
          }

          const clampedLayout = clampMobilePlayerPreviewLayout({
            width: nextWidth,
            x: dragState.originX,
            y: dragState.originY,
          });
          const nextHeight = getPreviewHeight(clampedLayout.width);
          const nextFrameWidth = clampedLayout.width + dragState.frameWidthOffset;
          const nextFrameHeight = nextHeight + dragState.frameHeightOffset;

          if (resizeDirection.includes('left')) {
            nextX = originRight - nextFrameWidth;
          }

          if (resizeDirection.includes('top')) {
            nextY = originBottom - nextFrameHeight;
          }

          setMobilePlayerPreviewLayout(
            clampMobilePlayerPreviewLayout({
              width: clampedLayout.width,
              x: nextX,
              y: nextY,
            }),
          );
        }}
        onPointerUp={(event: ReactPointerEvent<HTMLDivElement>) => {
          if (dragStateRef.current?.pointerId === event.pointerId) {
            dragStateRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={(event: ReactPointerEvent<HTMLDivElement>) => {
          if (dragStateRef.current?.pointerId === event.pointerId) {
            dragStateRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
      >
        <div className="app-shell__sticky-player-preview-frame">
          <span
            aria-hidden="true"
            className="app-shell__sticky-player-preview-resize-handle app-shell__sticky-player-preview-resize-handle--top-left"
            data-resize-direction="top-left"
          />
          <span
            aria-hidden="true"
            className="app-shell__sticky-player-preview-resize-handle app-shell__sticky-player-preview-resize-handle--top-right"
            data-resize-direction="top-right"
          />
          <span
            aria-hidden="true"
            className="app-shell__sticky-player-preview-drag-layer"
          >
            <span className="app-shell__sticky-player-preview-drag-grip" />
          </span>
          <div
            ref={mobilePlayerDockSlotRef}
            aria-hidden="true"
            className="app-shell__sticky-player-preview-thumb app-shell__sticky-player-preview-thumb--player app-shell__sticky-player-preview-dock-slot"
          />
        </div>
      </div>
    ) : null;
  const stickySelectedVideoSlot =
    stickySelectedVideoContent && isStickySelectedVideoVisible ? (
      <div
        className="app-shell__sticky-selected-video-slot"
        data-cinematic={playerStageProps.isCinematicModeActive}
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
  const renderFilterBar = () => <FilterBar {...filterBarProps} />;
  const renderChartPanel = (isCinematic = false) => (
    <ChartPanel
      {...chartPanelProps}
      className={isCinematic ? getCinematicChartClassName(chartPanelProps.className) : chartPanelProps.className}
    />
  );
  const fullscreenElement = typeof document === 'undefined' ? null : getFullscreenElement();
  const renderedStickySelectedVideoSlot =
    playerStageProps.isCinematicModeActive &&
    stickySelectedVideoSlot &&
    fullscreenElement instanceof HTMLElement
      ? createPortal(stickySelectedVideoSlot, fullscreenElement)
      : stickySelectedVideoSlot;
  const renderedStickyPlayerPreview =
    stickyPlayerPreview && typeof document !== 'undefined'
      ? createPortal(stickyPlayerPreview, document.body)
      : stickyPlayerPreview;
  const videoPlayerDockStyle: CSSProperties | undefined = desktopDockStyle
    ? {
        height: `${desktopDockStyle.dockHeight}px`,
        left: `${desktopDockStyle.left}px`,
        position: 'fixed',
        top: `${desktopDockStyle.top}px`,
        width: `${desktopDockStyle.width}px`,
      }
    : mobileDockStyle
      ? {
          height: `${mobileDockStyle.height}px`,
          left: `${mobileDockStyle.left}px`,
          position: 'fixed',
          top: `${mobileDockStyle.top}px`,
          width: `${mobileDockStyle.width}px`,
        }
      : undefined;
  const playerViewportStyle: CSSProperties | undefined = desktopDockStyle
    ? { height: `${desktopDockStyle.height}px` }
    : mobileDockStyle
      ? { height: `${mobileDockStyle.viewportHeight}px` }
      : undefined;
  const shouldRenderDetachedMobileViewport =
    playerStageProps.isMobileLayout && !playerStageProps.isCinematicModeActive;

  return (
    <>
      {renderedStickyPlayerPreview}
      {renderedStickySelectedVideoSlot}
      {shouldRenderDetachedMobileViewport ? (
        <>
          <PlayerStageHeader
            cinematicToggleLabel={playerStageProps.cinematicToggleLabel}
            isCinematicModeActive={playerStageProps.isCinematicModeActive}
            isMobileLayout={playerStageProps.isMobileLayout}
            onOpenRegionModal={playerStageProps.onOpenRegionModal}
            onOpenViewModal={playerStageProps.onOpenViewModal}
            onToggleCinematicMode={playerStageProps.onToggleCinematicMode}
            selectedCategoryLabel={playerStageProps.selectedCategoryLabel}
            selectedCountryName={playerStageProps.selectedCountryName}
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
        {...playerStageProps}
        chartContent={renderChartPanel(true)}
        filterContent={renderFilterBar()}
        isVideoPlayerDocked={Boolean(videoPlayerDockStyle)}
        renderHeaderInline={!shouldRenderDetachedMobileViewport}
        playerViewportStyle={playerViewportStyle}
        renderViewportInline={!shouldRenderDetachedMobileViewport}
        videoPlayerDockStyle={videoPlayerDockStyle}
      />
      <CommunityPanel {...communityPanelProps} />
      {!playerStageProps.isCinematicModeActive ? renderFilterBar() : null}
      {!playerStageProps.isCinematicModeActive ? renderChartPanel() : null}
    </>
  );
}
