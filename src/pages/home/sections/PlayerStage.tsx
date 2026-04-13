import type { CSSProperties, ReactNode, RefObject } from 'react';
import VideoPlayer, { type VideoPlayerHandle } from '../../../components/VideoPlayer/VideoPlayer';
import type { AuthStatus } from '../../../features/auth/types';
import type { PendingPlaybackRestore } from '../utils';
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
  isManualPlaybackSaveDisabled: boolean;
  isMobileLayout: boolean;
  isSelectedChannelFavorited: boolean;
  manualPlaybackSaveButtonLabel: string;
  manualPlaybackSaveStatus?: string;
  onManualPlaybackSave: () => void;
  onNextVideo: () => void;
  onOpenRegionModal: () => void;
  onPreviousVideo: () => void;
  onPlaybackRestoreApplied?: (restoreId: number) => void;
  onToggleCinematicMode: () => void;
  onToggleFavoriteStreamer: () => void;
  playbackRestore?: PendingPlaybackRestore | null;
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
  isManualPlaybackSaveDisabled,
  isMobileLayout,
  isSelectedChannelFavorited,
  manualPlaybackSaveButtonLabel,
  manualPlaybackSaveStatus,
  onManualPlaybackSave,
  onNextVideo,
  onOpenRegionModal,
  onPreviousVideo,
  onPlaybackRestoreApplied,
  onToggleCinematicMode,
  onToggleFavoriteStreamer,
  playbackRestore,
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
              onPlaybackRestoreApplied={onPlaybackRestoreApplied}
              onPreviousVideo={onPreviousVideo}
              onVideoEnd={onNextVideo}
              playbackRestore={playbackRestore}
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
                <div className="app-shell__stage-actions">
                  {stageActionContent}
                  <div className="app-shell__stage-action-item">
                    <button
                      aria-label={manualPlaybackSaveButtonLabel}
                      className="app-shell__stage-action-button app-shell__stage-action-button--save"
                      disabled={isManualPlaybackSaveDisabled}
                      onClick={onManualPlaybackSave}
                      title={manualPlaybackSaveButtonLabel}
                      type="button"
                    >
                      <span className="app-shell__stage-action-icon" aria-hidden="true">
                        {manualPlaybackSaveButtonLabel === '저장 중...' ? (
                          '⋯'
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none">
                            <path
                              d="M7.25 4.75h9.5a1.5 1.5 0 0 1 1.5 1.5v11.5a1.5 1.5 0 0 1-1.5 1.5h-9.5a1.5 1.5 0 0 1-1.5-1.5V6.25a1.5 1.5 0 0 1 1.5-1.5Z"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.7"
                            />
                            <path
                              d="M9 9.25h6M9 12.25h6M9 15.25h4"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.7"
                            />
                          </svg>
                        )}
                      </span>
                    </button>
                    <span className="app-shell__stage-action-caption">저장</span>
                  </div>
                </div>
                <p
                  aria-hidden={!manualPlaybackSaveStatus}
                  aria-live="polite"
                  className="app-shell__stage-status"
                  data-visible={Boolean(manualPlaybackSaveStatus)}
                  role="status"
                >
                  {manualPlaybackSaveStatus ?? ' '}
                </p>
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
