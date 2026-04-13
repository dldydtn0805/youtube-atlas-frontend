import type { CSSProperties, ReactNode, RefObject } from 'react';
import VideoPlayer, { type VideoPlayerHandle } from '../../../components/VideoPlayer/VideoPlayer';
import type { AuthStatus } from '../../../features/auth/types';
import './PlayerStage.css';

interface PlayerStageProps {
  authStatus: AuthStatus;
  canNavigateVideos: boolean;
  chartContent?: ReactNode;
  cinematicToggleLabel: string;
  favoriteToggleLabel: string;
  filterContent?: ReactNode;
  isChartLoading: boolean;
  isCinematicModeActive: boolean;
  isFavoriteToggleDisabled: boolean;
  isMobileLayout: boolean;
  isSelectedChannelFavorited: boolean;
  onNextVideo: () => void;
  onOpenRegionModal: () => void;
  onPreviousVideo: () => void;
  onToggleCinematicMode: () => void;
  onToggleFavoriteStreamer: () => void;
  playerRef: RefObject<VideoPlayerHandle | null>;
  playerSectionRef: RefObject<HTMLElement | null>;
  playerStageRef: RefObject<HTMLDivElement | null>;
  playerViewportRef: RefObject<HTMLDivElement | null>;
  playerViewportStyle?: CSSProperties;
  selectedCategoryLabel?: string;
  selectedCountryName: string;
  selectedVideoChannelTitle?: string;
  selectedVideoId?: string;
  selectedVideoTitle?: string;
  videoPlayerDockStyle?: CSSProperties;
  isVideoPlayerDocked?: boolean;
  stageActionContent?: ReactNode;
  stageMetadataContent?: ReactNode;
  supplementalContent?: ReactNode;
  topContent?: ReactNode;
  toggleFavoriteStreamerPending: boolean;
}

function PlayerStage({
  authStatus,
  canNavigateVideos,
  chartContent,
  cinematicToggleLabel,
  favoriteToggleLabel,
  filterContent,
  isChartLoading,
  isCinematicModeActive,
  isFavoriteToggleDisabled,
  isMobileLayout,
  isSelectedChannelFavorited,
  onNextVideo,
  onOpenRegionModal,
  onPreviousVideo,
  onToggleCinematicMode,
  onToggleFavoriteStreamer,
  playerRef,
  playerSectionRef,
  playerStageRef,
  playerViewportRef,
  playerViewportStyle,
  selectedCategoryLabel,
  selectedCountryName,
  selectedVideoChannelTitle,
  selectedVideoId,
  selectedVideoTitle,
  videoPlayerDockStyle,
  isVideoPlayerDocked = false,
  stageActionContent,
  stageMetadataContent,
  supplementalContent,
  topContent,
  toggleFavoriteStreamerPending,
}: PlayerStageProps) {
  const hasSelectedVideo = Boolean(selectedVideoId);
  const isVideoPlayerCinematic =
    isCinematicModeActive || (isMobileLayout && isVideoPlayerDocked);

  return (
    <div
      ref={playerStageRef}
      className="app-shell__stage"
      data-cinematic={isCinematicModeActive}
      data-player-docked={isVideoPlayerDocked ? 'true' : 'false'}
    >
      <div
        className="app-shell__stage-stack"
        data-cinematic={isCinematicModeActive}
        data-player-docked={isVideoPlayerDocked ? 'true' : 'false'}
      >
        {isCinematicModeActive ? topContent : null}
        <section
          ref={playerSectionRef}
          className="app-shell__panel app-shell__panel--player"
          data-cinematic={isCinematicModeActive}
          data-player-docked={isVideoPlayerDocked}
        >
          <div className="app-shell__section-heading app-shell__section-heading--player">
            <div className="app-shell__section-heading-copy">
              <p className="app-shell__section-eyebrow">Now Playing</p>
              <h2 className="app-shell__section-title">
                <button className="app-shell__section-title-button" onClick={onOpenRegionModal} type="button">
                  {selectedCountryName}
                </button>
                {selectedCategoryLabel ? ` · ${selectedCategoryLabel}` : ''}
              </h2>
            </div>
            {!isMobileLayout ? (
              <div className="app-shell__player-actions">
                <button
                  aria-label={cinematicToggleLabel}
                  className="app-shell__mode-toggle"
                  data-active={isCinematicModeActive}
                  onClick={onToggleCinematicMode}
                  title={cinematicToggleLabel}
                  type="button"
                >
                  {cinematicToggleLabel}
                </button>
              </div>
            ) : null}
          </div>
          <div
            ref={playerViewportRef}
            className="app-shell__player-viewport"
            data-docked={isVideoPlayerDocked ? 'true' : 'false'}
            style={playerViewportStyle}
          >
            <VideoPlayer
              canNavigateVideos={canNavigateVideos}
              dockStyle={videoPlayerDockStyle}
              isCinematic={isVideoPlayerCinematic}
              isDocked={isVideoPlayerDocked}
              isLoading={isChartLoading}
              onNextVideo={onNextVideo}
              onPreviousVideo={onPreviousVideo}
              onVideoEnd={onNextVideo}
              ref={playerRef}
              selectedVideoId={selectedVideoId}
              showOverlayNavigation={!isMobileLayout}
            />
          </div>
          {hasSelectedVideo ? (
            <div className="app-shell__stage-meta">
              <div className="app-shell__stage-copy">
                <div className="app-shell__stage-headline">
                  <h3 className="app-shell__stage-title">{selectedVideoTitle}</h3>
                </div>
                <div className="app-shell__stage-channel-row">
                  <p className="app-shell__stage-channel">{selectedVideoChannelTitle}</p>
                  <button
                    aria-label={favoriteToggleLabel}
                    className="app-shell__stage-channel-favorite"
                    data-active={isSelectedChannelFavorited}
                    disabled={authStatus !== 'authenticated' || isFavoriteToggleDisabled}
                    onClick={onToggleFavoriteStreamer}
                    title={favoriteToggleLabel}
                    type="button"
                  >
                    {toggleFavoriteStreamerPending ? '...' : isSelectedChannelFavorited ? '★' : '☆'}
                  </button>
                </div>
                {stageMetadataContent ? <div className="app-shell__stage-summary">{stageMetadataContent}</div> : null}
              </div>
              <div className="app-shell__stage-side">
                <div className="app-shell__stage-actions">{stageActionContent}</div>
              </div>
            </div>
          ) : null}
          {supplementalContent}
        </section>
        {isCinematicModeActive ? filterContent : null}
        {isCinematicModeActive ? chartContent : null}
      </div>
    </div>
  );
}

export default PlayerStage;
