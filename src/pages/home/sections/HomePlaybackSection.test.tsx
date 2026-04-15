import { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePlaybackSection, { MOBILE_PLAYER_STAGE_STICKY_ENABLED_STORAGE_KEY } from './HomePlaybackSection';

vi.mock('./ContentPanels', () => ({
  ChartPanel: () => <div data-testid="chart-panel" />,
  CommunityPanel: () => <div data-testid="community-panel" />,
}));

vi.mock('./FilterPanels', () => ({
  FilterBar: () => <div data-testid="filter-bar" />,
}));

vi.mock('./PlayerStage', () => ({
  PlayerStageHeader: () => <div data-testid="player-stage-header">Now Playing</div>,
  PlayerViewportContent: ({
    playerViewportRef,
  }: {
    playerViewportRef: React.RefObject<HTMLDivElement | null>;
  }) => <div ref={playerViewportRef} data-testid="player-viewport" />,
  default: ({
    isVideoPlayerDocked,
    playerSectionRef,
    renderViewportInline,
    playerViewportRef,
    topContent,
  }: {
    isVideoPlayerDocked?: boolean;
    playerSectionRef: React.RefObject<HTMLElement | null>;
    renderViewportInline?: boolean;
    playerViewportRef: React.RefObject<HTMLDivElement | null>;
    topContent?: React.ReactNode;
  }) => (
    <div data-testid="player-stage">
      <div data-testid="player-dock-state">{isVideoPlayerDocked ? 'docked' : 'undocked'}</div>
      {topContent}
      <section ref={playerSectionRef} data-testid="player-section" />
      {renderViewportInline !== false ? <div ref={playerViewportRef} data-testid="player-viewport" /> : null}
    </div>
  ),
}));

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    void callback;
  }
}

describe('HomePlaybackSection', () => {
  const originalOffsetHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  const originalScrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  const originalScrollYDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollY');
  let animationFrameCallbacks = new Map<number, FrameRequestCallback>();
  let nextAnimationFrameId = 1;

  const flushAnimationFrames = () => {
    const callbacks = Array.from(animationFrameCallbacks.values());
    animationFrameCallbacks.clear();
    callbacks.forEach((callback) => callback(0));
  };

  const expandCollapsedStickyPanel = async () => {
    if (screen.queryByText('Selected video actions')) {
      return;
    }

    const expandButton = screen.queryByRole('button', { name: '선택한 영상 패널 펼치기' });

    if (!expandButton) {
      return;
    }

    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Selected video actions')).toBeInTheDocument();
    });
  };

  beforeEach(() => {
    animationFrameCallbacks = new Map<number, FrameRequestCallback>();
    nextAnimationFrameId = 1;
    window.localStorage.clear();
    window.localStorage.setItem('youtube-atlas-sticky-selected-video-collapsed', 'false');

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const frameId = nextAnimationFrameId;
      nextAnimationFrameId += 1;
      animationFrameCallbacks.set(frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (frameId: number) => {
      animationFrameCallbacks.delete(frameId);
    });

    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        return this.classList.contains('app-shell__sticky-selected-video-slot') ? 132 : 0;
      },
    });
  });

  afterEach(() => {
    if (originalOffsetHeightDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeightDescriptor);
    }

    if (originalScrollIntoViewDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoViewDescriptor);
    }

    if (originalScrollYDescriptor) {
      Object.defineProperty(window, 'scrollY', originalScrollYDescriptor);
    }

    vi.unstubAllGlobals();
  });

  it('starts with the sticky selected video collapsed by default', async () => {
    window.localStorage.removeItem('youtube-atlas-sticky-selected-video-collapsed');

    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: false,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
          } as never
        }
        stickySelectedVideoContent={<div>Selected video actions</div>}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Now Playing')).toBeInTheDocument();
    });

    window.dispatchEvent(new Event('scroll'));
    flushAnimationFrames();

    expect(screen.queryByText('Selected video actions')).not.toBeInTheDocument();
    expect(screen.getByText('Now Playing')).toBeInTheDocument();
  });

  it('renders the community panel between the player stage and filter bar', () => {
    const { getByTestId } = render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: false,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
          } as never
        }
      />,
    );

    const playerStage = getByTestId('player-stage');
    const communityPanel = getByTestId('community-panel');
    const filterBar = getByTestId('filter-bar');

    expect(playerStage.compareDocumentPosition(communityPanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(communityPanel.compareDocumentPosition(filterBar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('can collapse and expand the sticky selected video panel', async () => {
    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: false,
            isMobileLayout: false,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
            selectedVideoTitle: 'A very long selected video title for collapsed header',
          } as never
        }
        stickySelectedVideoContent={({ isMobilePlayerPreviewEnabled, onToggleCollapse, onToggleMobilePlayerPreviewEnabled }) => (
          <div>
            <button onClick={onToggleMobilePlayerPreviewEnabled} type="button">
              {isMobilePlayerPreviewEnabled ? 'now playing 끄기' : 'now playing 켜기'}
            </button>
            <button onClick={onToggleCollapse} type="button">
              접기
            </button>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    const playerViewport = screen.getByTestId('player-viewport');

    vi.spyOn(playerViewport, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: -20,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    flushAnimationFrames();

    await expandCollapsedStickyPanel();

    fireEvent.click(screen.getByRole('button', { name: '접기' }));

    expect(screen.queryByText('Selected video actions')).not.toBeInTheDocument();
    expect(screen.getByText('Now Playing')).toBeInTheDocument();
    expect(screen.getByText('A very long selected video title for collapsed header')).toBeInTheDocument();
    expect(screen.queryByText('선택한 영상 패널을 잠시 접어두었습니다.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('A very long selected video title for collapsed header'));

    expect(screen.getByText('Selected video actions')).toBeInTheDocument();
  });

  it('scrolls to the top when the collapsed now playing label is clicked', async () => {
    const scrollTo = vi.fn();

    vi.stubGlobal('scrollTo', scrollTo);

    const playerStageProps = {
      isCinematicModeActive: false,
      isMobileLayout: false,
      playerSectionRef: createRef<HTMLElement>(),
      playerStageRef: createRef<HTMLDivElement>(),
      playerViewportRef: createRef<HTMLDivElement>(),
    } as never;

    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={playerStageProps}
        stickySelectedVideoContent={({ onToggleCollapse }) => (
          <div>
            <button onClick={onToggleCollapse} type="button">
              접기
            </button>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    const playerViewport = screen.getByTestId('player-viewport');

    vi.spyOn(playerViewport, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: -20,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    flushAnimationFrames();

    await expandCollapsedStickyPanel();

    fireEvent.click(screen.getByRole('button', { name: '접기' }));
    fireEvent.click(screen.getByText('Now Playing'));

    expect(scrollTo).toHaveBeenCalledWith({
      behavior: 'smooth',
      top: 0,
    });
    expect(screen.queryByText('Selected video actions')).not.toBeInTheDocument();
    expect(screen.getByText('Now Playing')).toBeInTheDocument();
  });

  it('remembers the sticky selected video collapsed state', async () => {
    const playerStageProps = {
      isCinematicModeActive: false,
      isMobileLayout: false,
      playerSectionRef: createRef<HTMLElement>(),
      playerStageRef: createRef<HTMLDivElement>(),
      playerViewportRef: createRef<HTMLDivElement>(),
    } as never;

    const { unmount } = render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={playerStageProps}
        stickySelectedVideoContent={({ isMobilePlayerPreviewEnabled, onToggleCollapse, onToggleMobilePlayerPreviewEnabled }) => (
          <div>
            <button onClick={onToggleMobilePlayerPreviewEnabled} type="button">
              {isMobilePlayerPreviewEnabled ? 'now playing 끄기' : 'now playing 켜기'}
            </button>
            <button onClick={onToggleCollapse} type="button">
              접기
            </button>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    const playerViewport = screen.getByTestId('player-viewport');

    vi.spyOn(playerViewport, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: -20,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    flushAnimationFrames();

    await expandCollapsedStickyPanel();

    fireEvent.click(screen.getByRole('button', { name: '접기' }));
    expect(window.localStorage.getItem('youtube-atlas-sticky-selected-video-collapsed')).toBe('true');

    unmount();

    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: false,
            isMobileLayout: false,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
          } as never
        }
        stickySelectedVideoContent={<div>Selected video actions</div>}
      />,
    );

    const nextPlayerViewport = screen.getByTestId('player-viewport');

    vi.spyOn(nextPlayerViewport, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    flushAnimationFrames();

    await waitFor(() => {
      expect(screen.getByText('Now Playing')).toBeInTheDocument();
    });

    expect(screen.queryByText('Selected video actions')).not.toBeInTheDocument();
  });

  it('shows playback controls in the collapsed sticky header when callbacks are provided', async () => {
    const onPauseStickySelectedVideo = vi.fn();
    const onPlayNextStickySelectedVideo = vi.fn();
    const onPlayPreviousStickySelectedVideo = vi.fn();

    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        onPauseStickySelectedVideo={onPauseStickySelectedVideo}
        onPlayNextStickySelectedVideo={onPlayNextStickySelectedVideo}
        onPlayPreviousStickySelectedVideo={onPlayPreviousStickySelectedVideo}
        playerStageProps={
          {
            isCinematicModeActive: false,
            isMobileLayout: false,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
            selectedVideoId: 'video-1',
            selectedVideoTitle: 'Collapsed video',
          } as never
        }
        stickySelectedVideoContent={({ onToggleCollapse }) => (
          <div>
            <button onClick={onToggleCollapse} type="button">
              접기
            </button>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    const playerViewport = screen.getByTestId('player-viewport');

    vi.spyOn(playerViewport, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: -20,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    flushAnimationFrames();

    await expandCollapsedStickyPanel();

    fireEvent.click(screen.getByRole('button', { name: '접기' }));

    fireEvent.click(screen.getByRole('button', { name: '이전 영상' }));
    fireEvent.click(screen.getByRole('button', { name: '일시 정지' }));
    fireEvent.click(screen.getByRole('button', { name: '다음 영상' }));

    expect(onPlayPreviousStickySelectedVideo).toHaveBeenCalledTimes(1);
    expect(onPauseStickySelectedVideo).toHaveBeenCalledTimes(1);
    expect(onPlayNextStickySelectedVideo).toHaveBeenCalledTimes(1);
  });

  it('shows the sticky selected video panel in cinematic mode as well', async () => {
    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: true,
            isMobileLayout: false,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
          } as never
        }
        stickySelectedVideoContent={<div>Selected video actions</div>}
      />,
    );

    const playerViewport = screen.getByTestId('player-viewport');

    vi.spyOn(playerViewport, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    flushAnimationFrames();

    await expandCollapsedStickyPanel();
  });

  it('keeps the cinematic dock preview undocked while the selected video panel stays collapsed by default', async () => {
    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: true,
            isMobileLayout: false,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
            selectedVideoId: 'preview-video',
          } as never
        }
        stickySelectedVideoContent={({ desktopPlayerDockSlotRef, onToggleCollapse }) => (
          <div>
            <button onClick={onToggleCollapse} type="button">
              접기
            </button>
            <div ref={desktopPlayerDockSlotRef}>Dock Slot</div>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    const playerViewport = screen.getByTestId('player-viewport');

    vi.spyOn(playerViewport, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 0,
          height: 180,
          left: 0,
          right: 320,
          top: -180,
          width: 320,
          x: 0,
          y: -180,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    flushAnimationFrames();

    await waitFor(() => {
      expect(screen.getByText('Now Playing')).toBeInTheDocument();
    });

    expect(screen.queryByText('Selected video actions')).not.toBeInTheDocument();
    expect(screen.getByTestId('player-dock-state')).toHaveTextContent('undocked');
  });

  it('docks the desktop player into the selected video slot in default mode', async () => {
    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: false,
            isMobileLayout: false,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
            selectedVideoId: 'preview-video',
          } as never
        }
        stickySelectedVideoContent={({ desktopPlayerDockSlotRef }) => (
          <div>
            <div ref={desktopPlayerDockSlotRef}>Dock Slot</div>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    const playerViewport = screen.getByTestId('player-viewport');

    const getBoundingClientRect = vi.spyOn(playerViewport, 'getBoundingClientRect');

    getBoundingClientRect.mockImplementation(
      () =>
        ({
          bottom: 320,
          height: 180,
          left: 0,
          right: 320,
          top: 140,
          width: 320,
          x: 0,
          y: 140,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    flushAnimationFrames();

    await expandCollapsedStickyPanel();

    expect(screen.getByTestId('player-dock-state')).toHaveTextContent('undocked');

    getBoundingClientRect.mockImplementation(
      () =>
        ({
          bottom: 0,
          height: 180,
          left: 0,
          right: 320,
          top: -180,
          width: 320,
          x: 0,
          y: -180,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    window.dispatchEvent(new Event('scroll'));
    flushAnimationFrames();

    await waitFor(() => {
      expect(screen.getByTestId('player-dock-state')).toHaveTextContent('docked');
    });
  });

  it('keeps the mobile player preview hidden until it is manually enabled', async () => {
    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: false,
            isMobileLayout: true,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
            selectedVideoChannelTitle: 'Preview Channel',
            selectedVideoId: 'preview-video',
            selectedVideoTitle: 'Preview Title',
          } as never
        }
        stickySelectedVideoContent={<div>Selected video actions</div>}
      />,
    );

    flushAnimationFrames();
    expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('false');

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview-dock-slot')).not.toBeNull();
    });
    expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('false');
  });

  it('shows the mobile player preview immediately after it is manually enabled', async () => {
    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: false,
            isMobileLayout: true,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
            selectedVideoChannelTitle: 'Preview Channel',
            selectedVideoId: 'preview-video',
            selectedVideoTitle: 'Preview Title',
          } as never
        }
        stickySelectedVideoContent={({
          isMobilePlayerPreviewEnabled,
          onToggleMobilePlayerPreviewEnabled,
        }) => (
          <div>
            <button onClick={onToggleMobilePlayerPreviewEnabled} type="button">
              {isMobilePlayerPreviewEnabled ? 'now playing 끄기' : 'now playing 켜기'}
            </button>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    flushAnimationFrames();
    expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('false');

    const dockSlot = document.querySelector<HTMLElement>('.app-shell__sticky-player-preview-dock-slot');
    const playerViewport = screen.getByTestId('player-viewport');

    expect(dockSlot).not.toBeNull();
    vi.spyOn(dockSlot!, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 80,
          height: 68,
          left: 12,
          right: 132,
          top: 12,
          width: 120,
          x: 12,
          y: 12,
          toJSON: () => ({}),
        }) as DOMRect,
    );
    vi.spyOn(playerViewport, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 180,
          height: 180,
          left: 0,
          right: 320,
          top: 0,
          width: 320,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    fireEvent.click(screen.getByRole('button', { name: 'now playing 켜기' }));
    flushAnimationFrames();

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('true');
    });
    expect(screen.getByTestId('player-dock-state')).toHaveTextContent('docked');

    const stickyFrame = document.querySelector('.app-shell__sticky-selected-video-frame');
    expect(stickyFrame?.querySelector('.app-shell__sticky-player-preview-dock-slot')).toBeNull();
    expect(document.querySelector('.app-shell__sticky-player-preview-shell')).not.toBeNull();
    expect(document.querySelector('.app-shell__game-panel-actions-eyebrow')).toBeNull();
    expect(screen.getByText('Selected video actions')).toBeInTheDocument();
  });

  it('keeps the mobile player preview visible when the selected video changes', async () => {
    const playerStageProps = {
      isCinematicModeActive: false,
      isMobileLayout: true,
      playerSectionRef: createRef<HTMLElement>(),
      playerStageRef: createRef<HTMLDivElement>(),
      playerViewportRef: createRef<HTMLDivElement>(),
      selectedVideoChannelTitle: 'Preview Channel',
      selectedVideoId: 'preview-video',
      selectedVideoTitle: 'Preview Title',
    };

    const { rerender } = render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={playerStageProps as never}
        stickySelectedVideoContent={({
          isMobilePlayerPreviewEnabled,
          onToggleMobilePlayerPreviewEnabled,
        }) => (
          <div>
            <button onClick={onToggleMobilePlayerPreviewEnabled} type="button">
              {isMobilePlayerPreviewEnabled ? 'now playing 끄기' : 'now playing 켜기'}
            </button>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'now playing 켜기' }));

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('true');
    });

    rerender(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={{
          ...playerStageProps,
          selectedVideoId: 'next-preview-video',
          selectedVideoTitle: 'Next Preview Title',
        } as never}
        stickySelectedVideoContent={({
          isMobilePlayerPreviewEnabled,
          onToggleMobilePlayerPreviewEnabled,
        }) => (
          <div>
            <button onClick={onToggleMobilePlayerPreviewEnabled} type="button">
              {isMobilePlayerPreviewEnabled ? 'now playing 끄기' : 'now playing 켜기'}
            </button>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('true');
    });
    expect(window.localStorage.getItem('youtube-atlas-mobile-player-preview-enabled')).toBe('true');
  });

  it('starts the mobile player preview from the saved position on mount when available', async () => {
    window.localStorage.setItem(
      'youtube-atlas-mobile-player-preview-layout',
      JSON.stringify({
        width: 240,
        x: 99,
        y: 88,
      }),
    );

    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: false,
            isMobileLayout: true,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
            selectedVideoChannelTitle: 'Preview Channel',
            selectedVideoId: 'preview-video',
            selectedVideoTitle: 'Preview Title',
          } as never
        }
        stickySelectedVideoContent={<div>Selected video actions</div>}
      />,
    );

    const previewShell = document.querySelector<HTMLElement>('.app-shell__sticky-player-preview-shell');

    await waitFor(() => {
      expect(previewShell?.style.left).toBe('99px');
      expect(previewShell?.style.top).toBe('88px');
    });
  });

  it('does not cap the saved mobile player preview width at 360px', async () => {
    window.localStorage.setItem(
      'youtube-atlas-mobile-player-preview-layout',
      JSON.stringify({
        width: 900,
        x: 99,
        y: 88,
      }),
    );

    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: false,
            isMobileLayout: true,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
            selectedVideoChannelTitle: 'Preview Channel',
            selectedVideoId: 'preview-video',
            selectedVideoTitle: 'Preview Title',
          } as never
        }
        stickySelectedVideoContent={<div>Selected video actions</div>}
      />,
    );

    const previewShell = document.querySelector<HTMLElement>('.app-shell__sticky-player-preview-shell');

    await waitFor(() => {
      expect(previewShell?.style.getPropertyValue('--sticky-player-preview-width')).toBe('900px');
      expect(previewShell?.style.left).toBe('99px');
      expect(previewShell?.style.top).toBe('88px');
    });
  });

  it('starts the mobile player preview from the fixed top-left position when no saved position exists', async () => {
    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: false,
            isMobileLayout: true,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
            selectedVideoChannelTitle: 'Preview Channel',
            selectedVideoId: 'preview-video',
            selectedVideoTitle: 'Preview Title',
          } as never
        }
        stickySelectedVideoContent={<div>Selected video actions</div>}
      />,
    );

    const previewShell = document.querySelector<HTMLElement>('.app-shell__sticky-player-preview-shell');

    await waitFor(() => {
      expect(previewShell?.style.left).toBe('12px');
      expect(previewShell?.style.top).toBe('12px');
      expect(previewShell?.style.getPropertyValue('--sticky-player-preview-width')).toBe('360px');
    });

    expect(document.querySelector('.app-shell__sticky-player-preview-resize-handle--top-left')).not.toBeNull();
    expect(document.querySelector('.app-shell__sticky-player-preview-resize-handle--top-right')).not.toBeNull();
  });

  it('can disable the mobile player preview and remember the preference', async () => {
    const playerStageProps = {
      isCinematicModeActive: false,
      isMobileLayout: true,
      playerSectionRef: createRef<HTMLElement>(),
      playerStageRef: createRef<HTMLDivElement>(),
      playerViewportRef: createRef<HTMLDivElement>(),
      selectedVideoChannelTitle: 'Preview Channel',
      selectedVideoId: 'preview-video',
      selectedVideoTitle: 'Preview Title',
    } as never;

    const { unmount } = render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={playerStageProps}
        stickySelectedVideoContent={({ isMobilePlayerPreviewEnabled, onToggleMobilePlayerPreviewEnabled }) => (
          <div>
            <button onClick={onToggleMobilePlayerPreviewEnabled} type="button">
              {isMobilePlayerPreviewEnabled ? 'now playing 끄기' : 'now playing 켜기'}
            </button>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    const playerViewport = screen.getByTestId('player-viewport');
    const getBoundingClientRectMock = vi.spyOn(playerViewport, 'getBoundingClientRect');

    getBoundingClientRectMock.mockImplementation(
      () =>
        ({
          bottom: 0,
          height: 180,
          left: 0,
          right: 0,
          top: -180,
          width: 320,
          x: 0,
          y: -180,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    flushAnimationFrames();

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview-dock-slot')).not.toBeNull();
    });
    expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'now playing 켜기' }));

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('true');
    });
    expect(window.localStorage.getItem('youtube-atlas-mobile-player-preview-enabled')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'now playing 끄기' }));

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('false');
    });
    expect(window.localStorage.getItem('youtube-atlas-mobile-player-preview-enabled')).toBe('false');

    unmount();

    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={playerStageProps}
        stickySelectedVideoContent={({ isMobilePlayerPreviewEnabled }) => (
          <div>
            <div>{isMobilePlayerPreviewEnabled ? 'now playing 켜짐' : 'now playing 꺼짐'}</div>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    flushAnimationFrames();

    await waitFor(() => {
      expect(screen.getByText('now playing 꺼짐')).toBeInTheDocument();
    });
    expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('false');
  });

  it('can toggle the mobile player stage sticky shell and remember the preference', async () => {
    const playerStageProps = {
      isCinematicModeActive: false,
      isMobileLayout: true,
      playerSectionRef: createRef<HTMLElement>(),
      playerStageRef: createRef<HTMLDivElement>(),
      playerViewportRef: createRef<HTMLDivElement>(),
      selectedVideoChannelTitle: 'Preview Channel',
      selectedVideoId: 'preview-video',
      selectedVideoTitle: 'Preview Title',
    } as never;

    const { unmount } = render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={playerStageProps}
        stickySelectedVideoContent={({
          isMobilePlayerStageStickyEnabled,
          onToggleMobilePlayerStageStickyEnabled,
        }) => (
          <div>
            <button onClick={onToggleMobilePlayerStageStickyEnabled} type="button">
              {isMobilePlayerStageStickyEnabled ? '상단 스티키 끄기' : '상단 스티키 켜기'}
            </button>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    flushAnimationFrames();

    await waitFor(() => {
      expect(screen.getByText('상단 스티키 끄기')).toBeInTheDocument();
    });
    expect(document.querySelector('.app-shell__mobile-player-stage-sticky-shell')?.getAttribute('data-sticky-enabled')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: '상단 스티키 끄기' }));

    await waitFor(() => {
      expect(document.querySelector('.app-shell__mobile-player-stage-sticky-shell')?.getAttribute('data-sticky-enabled')).toBe('false');
    });
    expect(window.localStorage.getItem(MOBILE_PLAYER_STAGE_STICKY_ENABLED_STORAGE_KEY)).toBe('false');

    unmount();

    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={playerStageProps}
        stickySelectedVideoContent={({ isMobilePlayerStageStickyEnabled }) => (
          <div>
            <div>{isMobilePlayerStageStickyEnabled ? '상단 스티키 켜짐' : '상단 스티키 꺼짐'}</div>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    flushAnimationFrames();

    await waitFor(() => {
      expect(screen.getByText('상단 스티키 꺼짐')).toBeInTheDocument();
    });
    expect(document.querySelector('.app-shell__mobile-player-stage-sticky-shell')?.getAttribute('data-sticky-enabled')).toBe('false');
  });

  it('keeps the mobile player preview visible while the mobile selected video panel is collapsed', async () => {
    const scrollTo = vi.fn();

    vi.stubGlobal('scrollTo', scrollTo);

    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: false,
            isMobileLayout: true,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
            selectedVideoChannelTitle: 'Preview Channel',
            selectedVideoId: 'preview-video',
            selectedVideoTitle: 'Preview Title',
          } as never
        }
        stickySelectedVideoContent={({ isMobilePlayerPreviewEnabled, onToggleCollapse, onToggleMobilePlayerPreviewEnabled }) => (
          <div>
            <button onClick={onToggleMobilePlayerPreviewEnabled} type="button">
              {isMobilePlayerPreviewEnabled ? 'now playing 끄기' : 'now playing 켜기'}
            </button>
            <button onClick={onToggleCollapse} type="button">
              접기
            </button>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    const playerViewport = screen.getByTestId('player-viewport');

    vi.spyOn(playerViewport, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 0,
          height: 180,
          left: 0,
          right: 0,
          top: -180,
          width: 320,
          x: 0,
          y: -180,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    flushAnimationFrames();

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview-dock-slot')).not.toBeNull();
    });
    expect(document.querySelector<HTMLElement>('.app-shell__sticky-player-preview-shell')?.style.left).toBe('12px');
    expect(document.querySelector<HTMLElement>('.app-shell__sticky-player-preview-shell')?.style.top).toBe('12px');
    expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'now playing 켜기' }));

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('true');
    });

    fireEvent.click(screen.getByRole('button', { name: '접기' }));

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('true');
      expect(document.querySelector('.app-shell__game-panel-actions-eyebrow')).toHaveTextContent('Now Playing');
      expect(screen.getByRole('button', { name: '페이지 맨 위로 즉시 이동' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '상단 영상 스티키 끄기' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '미니 플레이어 숨기기' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '페이지 맨 위로 즉시 이동' }));

    expect(scrollTo).toHaveBeenCalledWith({
      behavior: 'auto',
      top: 0,
    });

    fireEvent.click(document.querySelector('.app-shell__game-panel-actions-eyebrow') as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('Selected video actions')).toBeInTheDocument();
    });

    expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('true');
    expect(document.querySelector<HTMLElement>('.app-shell__sticky-player-preview-shell')?.style.left).toBe('12px');
    expect(document.querySelector<HTMLElement>('.app-shell__sticky-player-preview-shell')?.style.top).toBe('12px');
  });

  it('scrolls to the player stage when the top button is pressed', async () => {
    const scrollTo = vi.fn();

    vi.stubGlobal('scrollTo', scrollTo);

    render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            isCinematicModeActive: false,
            isMobileLayout: false,
            playerSectionRef: createRef<HTMLElement>(),
            playerStageRef: createRef<HTMLDivElement>(),
            playerViewportRef: createRef<HTMLDivElement>(),
          } as never
        }
        stickySelectedVideoContent={({ onScrollToTop }) => (
          <div>
            <button onClick={onScrollToTop} type="button">
              맨 위로
            </button>
            <div>Selected video actions</div>
          </div>
        )}
      />,
    );

    const playerViewport = screen.getByTestId('player-viewport');
    vi.spyOn(playerViewport, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    flushAnimationFrames();

    await expandCollapsedStickyPanel();

    fireEvent.click(screen.getByRole('button', { name: '맨 위로' }));

    expect(scrollTo).toHaveBeenCalledWith({
      behavior: 'smooth',
      top: 0,
    });
  });

  it('jumps to the top when a new video is selected on mobile while sticky is disabled', async () => {
    const scrollTo = vi.fn();

    vi.stubGlobal('scrollTo', scrollTo);
    window.localStorage.setItem(MOBILE_PLAYER_STAGE_STICKY_ENABLED_STORAGE_KEY, 'false');

    const playerStageProps = {
      isCinematicModeActive: false,
      isMobileLayout: true,
      playerSectionRef: createRef<HTMLElement>(),
      playerStageRef: createRef<HTMLDivElement>(),
      playerViewportRef: createRef<HTMLDivElement>(),
      selectedVideoId: 'video-1',
    };

    const { rerender } = render(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={playerStageProps as never}
        stickySelectedVideoContent={<div>Selected video actions</div>}
      />,
    );

    flushAnimationFrames();
    scrollTo.mockClear();

    rerender(
      <HomePlaybackSection
        chartPanelProps={{} as never}
        communityPanelProps={{} as never}
        filterBarProps={{} as never}
        playerStageProps={
          {
            ...playerStageProps,
            selectedVideoId: 'video-2',
          } as never
        }
        stickySelectedVideoContent={<div>Selected video actions</div>}
      />,
    );

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({
        behavior: 'auto',
        top: 0,
      });
    });
  });
});
