import { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePlaybackSection from './HomePlaybackSection';

vi.mock('./ContentPanels', () => ({
  ChartPanel: () => <div data-testid="chart-panel" />,
  CommunityPanel: () => <div data-testid="community-panel" />,
}));

vi.mock('./FilterPanels', () => ({
  FilterBar: () => <div data-testid="filter-bar" />,
}));

vi.mock('./MiniVideoPreview', () => ({
  default: ({
    containerClassName,
    frameClassName,
  }: {
    containerClassName: string;
    frameClassName: string;
  }) => (
    <div className={containerClassName} data-testid="mini-video-preview">
      <div className={frameClassName} />
    </div>
  ),
}));

vi.mock('./PlayerStage', () => ({
  default: ({
    playerSectionRef,
    playerViewportRef,
    topContent,
  }: {
    playerSectionRef: React.RefObject<HTMLElement | null>;
    playerViewportRef: React.RefObject<HTMLDivElement | null>;
    topContent?: React.ReactNode;
  }) => (
    <div data-testid="player-stage">
      {topContent}
      <section ref={playerSectionRef} data-testid="player-section" />
      <div ref={playerViewportRef} data-testid="player-viewport" />
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

  beforeEach(() => {
    animationFrameCallbacks = new Map<number, FrameRequestCallback>();
    nextAnimationFrameId = 1;
    window.localStorage.clear();

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

  it('keeps the sticky selected video always visible in default mode', async () => {
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
      expect(screen.getByText('Selected video actions')).toBeInTheDocument();
    });

    window.dispatchEvent(new Event('scroll'));
    flushAnimationFrames();

    expect(screen.getByText('Selected video actions')).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByText('Selected video actions')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '접기' }));

    expect(screen.queryByText('Selected video actions')).not.toBeInTheDocument();
    expect(screen.getByText('Selected Video')).toBeInTheDocument();
    expect(screen.queryByText('선택한 영상 패널을 잠시 접어두었습니다.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '선택한 영상 패널 펼치기' }));

    expect(screen.getByText('Selected video actions')).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByText('Selected video actions')).toBeInTheDocument();
    });

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
      expect(screen.getByText('Selected Video')).toBeInTheDocument();
    });

    expect(screen.queryByText('Selected video actions')).not.toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByText('Selected video actions')).toBeInTheDocument();
    });
  });

  it('shows the mobile player preview above selected video only after the player is hidden', async () => {
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

    const playerViewport = screen.getByTestId('player-viewport');

    const getBoundingClientRectMock = vi.spyOn(playerViewport, 'getBoundingClientRect');

    getBoundingClientRectMock.mockImplementation(
      () =>
        ({
          bottom: 180,
          height: 180,
          left: 0,
          right: 0,
          top: 20,
          width: 320,
          x: 0,
          y: 20,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    flushAnimationFrames();
    expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('false');

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

    window.dispatchEvent(new Event('scroll'));
    flushAnimationFrames();

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview')).not.toBeNull();
    });
    expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('true');

    const stickyFrame = document.querySelector('.app-shell__sticky-selected-video-frame');
    expect(stickyFrame?.querySelector('.app-shell__sticky-player-preview')).toBeNull();
    expect(document.querySelector('.app-shell__sticky-player-preview-shell')).not.toBeNull();
    expect(screen.queryByText('Now Playing')).not.toBeInTheDocument();
    expect(screen.getByText('Selected video actions')).toBeInTheDocument();
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
      expect(document.querySelector('.app-shell__sticky-player-preview')).not.toBeNull();
    });

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

  it('restores the mobile player preview after expanding the collapsed panel', async () => {
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
      expect(document.querySelector('.app-shell__sticky-player-preview')).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: '접기' }));

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview-shell')?.getAttribute('data-visible')).toBe('false');
    });

    fireEvent.click(screen.getByRole('button', { name: '선택한 영상 패널 펼치기' }));

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sticky-player-preview')).not.toBeNull();
    });
    expect(screen.getByText('Selected video actions')).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '맨 위로' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '맨 위로' }));

    expect(scrollTo).toHaveBeenCalledWith({
      behavior: 'smooth',
      top: 0,
    });
  });
});
