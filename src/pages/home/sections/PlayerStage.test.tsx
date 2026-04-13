import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlayerStage from './PlayerStage';

vi.mock('../../../components/VideoPlayer/VideoPlayer', () => ({
  default: ({ isCinematic }: { isCinematic?: boolean }) => (
    <div data-cinematic={isCinematic ? 'true' : 'false'} data-testid="video-player" />
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
});
