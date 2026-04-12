import { useEffect, useRef, useState, type CSSProperties, type ComponentProps, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ChartPanel, CommunityPanel } from './ContentPanels';
import { FilterBar } from './FilterPanels';
import MiniVideoPreview from './MiniVideoPreview';
import PlayerStage from './PlayerStage';
import { getFullscreenElement } from '../utils';
import './HomePlaybackSection.css';

const STICKY_SELECTED_VIDEO_TOP_OFFSET = 12;
const STICKY_SELECTED_VIDEO_COLLAPSED_STORAGE_KEY = 'youtube-atlas-sticky-selected-video-collapsed';
const MOBILE_PLAYER_PREVIEW_ENABLED_STORAGE_KEY = 'youtube-atlas-mobile-player-preview-enabled';
const MOBILE_PLAYER_PREVIEW_LAYOUT_STORAGE_KEY = 'youtube-atlas-mobile-player-preview-layout';
const MOBILE_PLAYER_PREVIEW_TRIGGER_OFFSET = 8;
const MOBILE_PLAYER_PREVIEW_MIN_WIDTH = 96;
const MOBILE_PLAYER_PREVIEW_MAX_WIDTH = 360;
const MOBILE_PLAYER_PREVIEW_DEFAULT_WIDTH = 120;
const MOBILE_PLAYER_PREVIEW_ASPECT_RATIO = 16 / 9;
const MOBILE_PLAYER_PREVIEW_MARGIN = 12;
const MOBILE_PLAYER_PREVIEW_RESIZE_EDGE = 18;

interface MobilePlayerPreviewLayout {
  width: number;
  x: number;
  y: number;
}

type MobilePlayerPreviewResizeDirection =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

interface StickySelectedVideoControls {
  isDesktopPlayerDockActive: boolean;
  desktopPlayerDockSlotRef?: RefObject<HTMLDivElement | null>;
  isDesktopPlayerDockEnabled: boolean;
  isMobilePlayerPreviewEnabled: boolean;
  onScrollToTop: () => void;
  onToggleMobilePlayerPreviewEnabled: () => void;
  onToggleCollapse: () => void;
}

interface HomePlaybackSectionProps {
  chartPanelProps: ComponentProps<typeof ChartPanel>;
  communityPanelProps: ComponentProps<typeof CommunityPanel>;
  filterBarProps: ComponentProps<typeof FilterBar>;
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
    return false;
  }

  return window.localStorage.getItem(STICKY_SELECTED_VIDEO_COLLAPSED_STORAGE_KEY) === 'true';
}

function getInitialMobilePlayerPreviewEnabled() {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.localStorage.getItem(MOBILE_PLAYER_PREVIEW_ENABLED_STORAGE_KEY) !== 'false';
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
  height: number,
): MobilePlayerPreviewResizeDirection | null {
  const isLeft = offsetX <= MOBILE_PLAYER_PREVIEW_RESIZE_EDGE;
  const isRight = offsetX >= width - MOBILE_PLAYER_PREVIEW_RESIZE_EDGE;
  const isTop = offsetY <= MOBILE_PLAYER_PREVIEW_RESIZE_EDGE;
  const isBottom = offsetY >= height - MOBILE_PLAYER_PREVIEW_RESIZE_EDGE;

  if (isTop && isLeft) {
    return 'top-left';
  }

  if (isTop && isRight) {
    return 'top-right';
  }

  if (isBottom && isLeft) {
    return 'bottom-left';
  }

  if (isBottom && isRight) {
    return 'bottom-right';
  }

  if (isTop) {
    return 'top';
  }

  if (isRight) {
    return 'right';
  }

  if (isBottom) {
    return 'bottom';
  }

  if (isLeft) {
    return 'left';
  }

  return null;
}

function clampMobilePlayerPreviewLayout(layout: MobilePlayerPreviewLayout) {
  if (typeof window === 'undefined') {
    return layout;
  }

  const width = clampValue(
    layout.width,
    MOBILE_PLAYER_PREVIEW_MIN_WIDTH,
    Math.min(MOBILE_PLAYER_PREVIEW_MAX_WIDTH, window.innerWidth - (MOBILE_PLAYER_PREVIEW_MARGIN * 2)),
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
    Math.min(MOBILE_PLAYER_PREVIEW_MAX_WIDTH, window.innerWidth - (MOBILE_PLAYER_PREVIEW_MARGIN * 2)),
  );
  const height = getPreviewHeight(width);

  return clampMobilePlayerPreviewLayout({
    width,
    x: MOBILE_PLAYER_PREVIEW_MARGIN,
    y: window.innerHeight - height - 116,
  });
}

function getInitialMobilePlayerPreviewLayout() {
  if (typeof window === 'undefined') {
    return getDefaultMobilePlayerPreviewLayout();
  }

  const rawLayout = window.localStorage.getItem(MOBILE_PLAYER_PREVIEW_LAYOUT_STORAGE_KEY);

  if (!rawLayout) {
    return getDefaultMobilePlayerPreviewLayout();
  }

  try {
    const parsedLayout = JSON.parse(rawLayout) as Partial<MobilePlayerPreviewLayout>;

    if (
      typeof parsedLayout.width !== 'number' ||
      typeof parsedLayout.x !== 'number' ||
      typeof parsedLayout.y !== 'number'
    ) {
      return getDefaultMobilePlayerPreviewLayout();
    }

    return clampMobilePlayerPreviewLayout({
      width: parsedLayout.width,
      x: parsedLayout.x,
      y: parsedLayout.y,
    });
  } catch {
    return getDefaultMobilePlayerPreviewLayout();
  }
}

export default function HomePlaybackSection({
  chartPanelProps,
  communityPanelProps,
  filterBarProps,
  playerStageProps,
  preferredPreviewVideoId,
  stickySelectedVideoContent,
  stickySelectedVideoLabel = 'Selected Video',
}: HomePlaybackSectionProps) {
  const [isStickySelectedVideoVisible, setIsStickySelectedVideoVisible] = useState(false);
  const [isStickySelectedVideoCollapsed, setIsStickySelectedVideoCollapsed] = useState(
    getInitialStickySelectedVideoCollapsed,
  );
  const [isMobilePlayerPreviewEnabled, setIsMobilePlayerPreviewEnabled] = useState(
    getInitialMobilePlayerPreviewEnabled,
  );
  const [isMobilePlayerPreviewVisible, setIsMobilePlayerPreviewVisible] = useState(false);
  const [isMobilePlayerPreviewCollapsed, setIsMobilePlayerPreviewCollapsed] = useState(false);
  const mobilePlayerPreviewVideoId = preferredPreviewVideoId ?? playerStageProps.selectedVideoId;
  const [mobilePlayerPreviewLayout, setMobilePlayerPreviewLayout] = useState(
    getInitialMobilePlayerPreviewLayout,
  );
  const desktopPlayerDockSlotRef = useRef<HTMLDivElement | null>(null);
  const [desktopDockStyle, setDesktopDockStyle] = useState<{
    dockHeight: number;
    height: number;
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const dragStateRef = useRef<
    | {
        mode: 'drag' | 'resize';
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
  const suppressPreviewClickRef = useRef(false);

  useEffect(() => {
    setIsMobilePlayerPreviewVisible(false);
    setIsMobilePlayerPreviewCollapsed(false);
  }, [mobilePlayerPreviewVideoId]);

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
    const playerViewport = playerStageProps.playerViewportRef.current;

    if (
      typeof window === 'undefined' ||
      playerStageProps.isCinematicModeActive ||
      !playerStageProps.isMobileLayout ||
      !playerStageProps.selectedVideoId ||
      !playerViewport
    ) {
      setIsMobilePlayerPreviewVisible(false);
      setIsMobilePlayerPreviewCollapsed(false);
      return;
    }

    let animationFrameId: number | null = null;
    const scrollTarget: Window = window;

    const syncPreviewVisibility = () => {
      const playerViewportRect = playerViewport.getBoundingClientRect();
      const nextIsVisible =
        playerViewportRect.top < 0 &&
        playerViewportRect.bottom <= MOBILE_PLAYER_PREVIEW_TRIGGER_OFFSET;

      if (!nextIsVisible) {
        setIsMobilePlayerPreviewCollapsed(false);
      }

      setIsMobilePlayerPreviewVisible((currentValue) =>
        currentValue === nextIsVisible ? currentValue : nextIsVisible,
      );
    };

    const updatePreviewVisibility = () => {
      animationFrameId = null;
      syncPreviewVisibility();
    };

    const schedulePreviewVisibilityUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updatePreviewVisibility);
    };

    schedulePreviewVisibilityUpdate();
    window.addEventListener('resize', schedulePreviewVisibilityUpdate);
    scrollTarget.addEventListener('scroll', schedulePreviewVisibilityUpdate, { passive: true });

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener('resize', schedulePreviewVisibilityUpdate);
      scrollTarget.removeEventListener('scroll', schedulePreviewVisibilityUpdate);
    };
  }, [
    playerStageProps.isCinematicModeActive,
    playerStageProps.isMobileLayout,
    playerStageProps.playerViewportRef,
    playerStageProps.selectedVideoId,
  ]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !playerStageProps.isCinematicModeActive ||
      playerStageProps.isMobileLayout ||
      !playerStageProps.selectedVideoId ||
      !isStickySelectedVideoVisible
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
    isStickySelectedVideoVisible,
    playerStageProps.isCinematicModeActive,
    playerStageProps.isMobileLayout,
    playerStageProps.playerStageRef,
    playerStageProps.playerViewportRef,
    playerStageProps.selectedVideoId,
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

  const handleExpandStickySelectedVideo = () => {
    setIsStickySelectedVideoCollapsed(false);

    if (isMobilePlayerPreviewEnabled) {
      setIsMobilePlayerPreviewCollapsed(false);
    }
  };

  const renderedStickySelectedVideoContent =
    typeof stickySelectedVideoContent === 'function'
      ? stickySelectedVideoContent({
          isDesktopPlayerDockActive: Boolean(desktopDockStyle),
          desktopPlayerDockSlotRef,
          isDesktopPlayerDockEnabled:
            !playerStageProps.isMobileLayout &&
            playerStageProps.isCinematicModeActive &&
            isStickySelectedVideoVisible,
          isMobilePlayerPreviewEnabled,
          onScrollToTop: handleScrollToTop,
          onToggleMobilePlayerPreviewEnabled: () => {
            setIsMobilePlayerPreviewEnabled((currentValue) => !currentValue);
            setIsMobilePlayerPreviewCollapsed(false);
          },
          onToggleCollapse: () => {
            setIsStickySelectedVideoCollapsed(true);
            setIsMobilePlayerPreviewCollapsed(true);
          },
        })
      : stickySelectedVideoContent;
  const shouldMountStickyPlayerPreview =
    !playerStageProps.isCinematicModeActive &&
    playerStageProps.isMobileLayout &&
    Boolean(mobilePlayerPreviewVideoId);
  const shouldShowStickyPlayerPreview =
    shouldMountStickyPlayerPreview &&
    isMobilePlayerPreviewEnabled &&
    !isMobilePlayerPreviewCollapsed;
  const stickyPlayerPreview =
    shouldMountStickyPlayerPreview && mobilePlayerPreviewVideoId ? (
      <div
        className="app-shell__sticky-player-preview-shell"
        data-visible={shouldShowStickyPlayerPreview && isMobilePlayerPreviewVisible ? 'true' : 'false'}
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
          const previewShell = event.currentTarget;
          const previewRect = previewShell.getBoundingClientRect();
          const offsetX = event.clientX - previewRect.left;
          const offsetY = event.clientY - previewRect.top;
          const resizeDirection = getResizeDirection(
            offsetX,
            offsetY,
            previewRect.width,
            previewRect.height,
          );

          if (!dragLayer && !resizeDirection) {
            return;
          }

          dragStateRef.current = {
            mode: resizeDirection ? 'resize' : 'drag',
            resizeDirection: resizeDirection ?? undefined,
            originHeight: getPreviewHeight(mobilePlayerPreviewLayout.width),
            originPointerX: event.clientX,
            originPointerY: event.clientY,
            originWidth: mobilePlayerPreviewLayout.width,
            originX: mobilePlayerPreviewLayout.x,
            originY: mobilePlayerPreviewLayout.y,
            pointerId: event.pointerId,
          };
          suppressPreviewClickRef.current = false;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event: ReactPointerEvent<HTMLDivElement>) => {
          const dragState = dragStateRef.current;

          if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
          }

          const deltaX = event.clientX - dragState.originPointerX;
          const deltaY = event.clientY - dragState.originPointerY;

          if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
            suppressPreviewClickRef.current = true;
          }

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

          const originRight = dragState.originX + dragState.originWidth;
          const originBottom = dragState.originY + dragState.originHeight;
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
            case 'right':
              nextWidth = dragState.originWidth + deltaX;
              break;
            case 'left':
              nextWidth = dragState.originWidth - deltaX;
              break;
            case 'bottom':
              nextWidth = widthFromHeightDelta(deltaY);
              break;
            case 'top':
              nextWidth = widthFromHeightDelta(-deltaY);
              break;
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
            case 'bottom-left': {
              const widthByX = dragState.originWidth - deltaX;
              const widthByY = widthFromHeightDelta(deltaY);
              nextWidth = Math.abs(widthByX - dragState.originWidth) >= Math.abs(widthByY - dragState.originWidth)
                ? widthByX
                : widthByY;
              break;
            }
            case 'bottom-right': {
              const widthByX = dragState.originWidth + deltaX;
              const widthByY = widthFromHeightDelta(deltaY);
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

          if (resizeDirection.includes('left')) {
            nextX = originRight - clampedLayout.width;
          }

          if (resizeDirection.includes('top')) {
            nextY = originBottom - nextHeight;
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
        <button
          aria-label="상단 미니 플레이어로 이동"
          className="app-shell__sticky-player-preview"
          onClick={(event) => {
            if (suppressPreviewClickRef.current) {
              suppressPreviewClickRef.current = false;
              event.preventDefault();
              return;
            }

            handleScrollToTop();
          }}
          type="button"
        >
          <MiniVideoPreview
            containerClassName="app-shell__sticky-player-preview-thumb app-shell__sticky-player-preview-thumb--player"
            frameClassName="app-shell__sticky-player-preview-frame"
            mainPlayerRef={playerStageProps.playerRef}
            selectedVideoId={mobilePlayerPreviewVideoId}
          />
        </button>
        <span
          aria-hidden="true"
          className="app-shell__sticky-player-preview-drag-layer"
        >
          <span className="app-shell__sticky-player-preview-drag-grip" />
        </span>
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
                    onClick={handleExpandStickySelectedVideo}
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
  const fullscreenElement = typeof document === 'undefined' ? null : getFullscreenElement();
  const renderedStickySelectedVideoSlot =
    playerStageProps.isCinematicModeActive &&
    stickySelectedVideoSlot &&
    fullscreenElement instanceof HTMLElement
      ? createPortal(stickySelectedVideoSlot, fullscreenElement)
      : stickySelectedVideoSlot;

  return (
    <>
      {stickyPlayerPreview}
      {renderedStickySelectedVideoSlot}
      <PlayerStage
        {...playerStageProps}
        chartContent={renderChartPanel(true)}
        filterContent={renderFilterBar()}
        isVideoPlayerDocked={Boolean(desktopDockStyle)}
        playerViewportStyle={desktopDockStyle ? { height: `${desktopDockStyle.height}px` } : undefined}
        videoPlayerDockStyle={
          desktopDockStyle
            ? {
                height: `${desktopDockStyle.dockHeight}px`,
                left: `${desktopDockStyle.left}px`,
                top: `${desktopDockStyle.top}px`,
                width: `${desktopDockStyle.width}px`,
              }
            : undefined
        }
      />
      {!playerStageProps.isCinematicModeActive ? renderFilterBar() : null}
      {!playerStageProps.isCinematicModeActive ? renderChartPanel() : null}
      <CommunityPanel {...communityPanelProps} />
    </>
  );
}
