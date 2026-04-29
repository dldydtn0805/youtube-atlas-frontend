import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlayerStage from './PlayerStage';

vi.mock('../../../components/VideoPlayer/VideoPlayer', () => ({
  default: ({ isCinematic }: { isCinematic?: boolean }) => (
    <div className="video-player" data-cinematic={isCinematic ? 'true' : 'false'} data-testid="video-player" />
  ),
}));

function createProps(overrides: Partial<React.ComponentProps<typeof PlayerStage>> = {}): React.ComponentProps<typeof PlayerStage> {
  return {
    authStatus: 'authenticated',
    canNavigateVideos: true,
    cinematicToggleLabel: '시네마틱 모드',
    favoriteToggleLabel: '즐겨찾기',
    isChartLoading: false,
    isCinematicModeActive: false,
    isFavoriteToggleDisabled: false,
    isManualPlaybackSaveDisabled: false,
    isMobileLayout: false,
    isSelectedChannelFavorited: false,
    manualPlaybackSaveButtonLabel: '재생 저장',
    onManualPlaybackSave: vi.fn(),
    onNextVideo: vi.fn(),
    onOpenRegionModal: vi.fn(),
    onPreviousVideo: vi.fn(),
    onToggleCinematicMode: vi.fn(),
    onToggleFavoriteStreamer: vi.fn(),
    playerRef: createRef(),
    playerSectionRef: createRef(),
    playerStageRef: createRef(),
    playerViewportRef: createRef(),
    selectedCountryName: '대한민국',
    toggleFavoriteStreamerPending: false,
    ...overrides,
  };
}

describe('PlayerStage', () => {
  it('shows the cinematic toggle on desktop layouts', () => {
    render(<PlayerStage {...createProps({ isMobileLayout: false })} />);

    expect(screen.getByRole('button', { name: '시네마틱 모드' })).toBeInTheDocument();
  });

  it('hides the cinematic toggle on mobile layouts', () => {
    render(<PlayerStage {...createProps({ isMobileLayout: true })} />);

    expect(screen.queryByRole('button', { name: '시네마틱 모드' })).not.toBeInTheDocument();
  });

  it('hides mobile game summary buttons for anonymous users', () => {
    render(
      <PlayerStage
        {...createProps({
          authStatus: 'anonymous',
          isMobileLayout: true,
        })}
      />,
    );

    expect(screen.queryByRole('button', { name: '내 게임 열기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '지갑 현황 열기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '티어 현황 열기' })).not.toBeInTheDocument();
  });

  it('keeps the mobile panel layout while only the docked video player uses the cinematic path', () => {
    const { container } = render(
      <PlayerStage
        {...createProps({
          isMobileLayout: true,
          isVideoPlayerDocked: true,
        })}
      />,
    );

    expect(container.querySelector('.app-shell__stage')?.getAttribute('data-cinematic')).toBe('false');
    expect(container.querySelector('.app-shell__stage-stack')?.getAttribute('data-cinematic')).toBe('false');
    expect(container.querySelector('.app-shell__panel--player')?.getAttribute('data-cinematic')).toBe('false');
    expect(screen.getByTestId('video-player')).toHaveAttribute('data-cinematic', 'true');
  });

  it('places chat beside the video in desktop cinematic mode', () => {
    const { container } = render(
      <PlayerStage
        {...createProps({
          communityContent: <div data-testid="cinematic-chat">chat</div>,
          isCinematicModeActive: true,
          isMobileLayout: false,
          selectedVideoChannelTitle: 'Channel',
          selectedVideoId: 'video-1',
          selectedVideoTitle: 'Video Title',
        })}
      />,
    );

    const layout = container.querySelector('.app-shell__watch-layout');
    const primary = container.querySelector('.app-shell__watch-primary');
    const chat = container.querySelector('.app-shell__watch-chat');

    expect(layout).toBeInTheDocument();
    expect(layout).toHaveAttribute('data-active', 'true');
    expect(primary?.contains(screen.getByTestId('video-player'))).toBe(true);
    expect(chat?.contains(screen.getByTestId('cinematic-chat'))).toBe(true);
  });

  it('keeps the watch layout inactive outside desktop cinematic mode', () => {
    const { container, rerender } = render(
      <PlayerStage
        {...createProps({
          communityContent: <div data-testid="desktop-chat">chat</div>,
          isCinematicModeActive: false,
          isMobileLayout: false,
        })}
      />,
    );

    expect(container.querySelector('.app-shell__watch-layout')).toHaveAttribute('data-active', 'false');

    rerender(
      <PlayerStage
        {...createProps({
          communityContent: <div data-testid="mobile-chat">chat</div>,
          isCinematicModeActive: true,
          isMobileLayout: true,
        })}
      />,
    );

    expect(container.querySelector('.app-shell__watch-layout')).toHaveAttribute('data-active', 'false');
  });

  it('keeps the video player mounted when cinematic mode toggles', () => {
    const { rerender } = render(
      <PlayerStage
        {...createProps({
          communityContent: <div data-testid="desktop-chat">chat</div>,
          isCinematicModeActive: false,
          isMobileLayout: false,
          selectedVideoChannelTitle: 'Channel',
          selectedVideoId: 'video-1',
          selectedVideoTitle: 'Video Title',
        })}
      />,
    );
    const videoPlayer = screen.getByTestId('video-player');

    rerender(
      <PlayerStage
        {...createProps({
          communityContent: <div data-testid="desktop-chat">chat</div>,
          isCinematicModeActive: true,
          isMobileLayout: false,
          selectedVideoChannelTitle: 'Channel',
          selectedVideoId: 'video-1',
          selectedVideoTitle: 'Video Title',
        })}
      />,
    );

    expect(screen.getByTestId('video-player')).toBe(videoPlayer);
    expect(screen.getByTestId('video-player')).toHaveAttribute('data-cinematic', 'true');
  });

  it('shows fallback rank and view count metadata when stage summary content is absent', () => {
    render(
      <PlayerStage
        {...createProps({
          selectedVideoChannelTitle: 'Channel',
          selectedVideoId: 'video-1',
          selectedVideoRankLabel: '3위',
          selectedVideoStatLabel: '12.5만',
          selectedVideoTitle: 'Video Title',
        })}
      />,
    );

    expect(screen.getByText('순위')).toBeInTheDocument();
    expect(screen.getByText('3위')).toBeInTheDocument();
    expect(screen.getByText('조회수')).toBeInTheDocument();
    expect(screen.getByText('12.5만')).toBeInTheDocument();
  });
});
