import type { ReactNode, RefObject } from 'react';
import VideoPlayer, { type VideoPlayerHandle } from '../../../components/VideoPlayer/VideoPlayer';
import type { AuthStatus } from '../../../features/auth/types';
import type { PendingPlaybackRestore } from '../utils';

interface PlayerStageProps {
  authStatus: AuthStatus;
  canNavigateVideos: boolean;
  chartContent?: ReactNode;
  cinematicQuickFiltersContent?: ReactNode;
  cinematicToggleLabel: string;
  favoriteToggleHelperText: string;
  favoriteToggleLabel: string;
  favoriteVideosContent?: ReactNode;
  isChartLoading: boolean;
  isDesktopCinematicMode: boolean;
  isFavoriteToggleDisabled: boolean;
  isManualPlaybackSaveDisabled: boolean;
  isMobileLayout: boolean;
  isSelectedChannelFavorited: boolean;
  manualPlaybackSaveButtonLabel: string;
  manualPlaybackSaveStatus?: string;
  onManualPlaybackSave: () => void;
  onNextVideo: () => void;
  onPreviousVideo: () => void;
  onPlaybackRestoreApplied?: (restoreId: number) => void;
  onToggleCinematicMode: () => void;
  onToggleFavoriteStreamer: () => void;
  playbackRestore?: PendingPlaybackRestore | null;
  playerRef: RefObject<VideoPlayerHandle | null>;
  playerSectionRef: RefObject<HTMLElement | null>;
  playerStageRef: RefObject<HTMLDivElement | null>;
  playerViewportRef: RefObject<HTMLDivElement | null>;
  selectedCategoryLabel?: string;
  selectedCountryName: string;
  selectedVideoChannelTitle?: string;
  selectedVideoId?: string;
  selectedVideoStatLabel?: string;
  selectedVideoTitle?: string;
  toggleFavoriteStreamerPending: boolean;
}

function PlayerStage({
  authStatus,
  canNavigateVideos,
  chartContent,
  cinematicQuickFiltersContent,
  cinematicToggleLabel,
  favoriteToggleHelperText,
  favoriteToggleLabel,
  favoriteVideosContent,
  isChartLoading,
  isDesktopCinematicMode,
  isFavoriteToggleDisabled,
  isManualPlaybackSaveDisabled,
  isMobileLayout,
  isSelectedChannelFavorited,
  manualPlaybackSaveButtonLabel,
  manualPlaybackSaveStatus,
  onManualPlaybackSave,
  onNextVideo,
  onPreviousVideo,
  onPlaybackRestoreApplied,
  onToggleCinematicMode,
  onToggleFavoriteStreamer,
  playbackRestore,
  playerRef,
  playerSectionRef,
  playerStageRef,
  playerViewportRef,
  selectedCategoryLabel,
  selectedCountryName,
  selectedVideoChannelTitle,
  selectedVideoId,
  selectedVideoStatLabel,
  selectedVideoTitle,
  toggleFavoriteStreamerPending,
}: PlayerStageProps) {
  const hasSelectedVideo = Boolean(selectedVideoId);

  return (
    <div ref={playerStageRef} className="app-shell__stage" data-cinematic={isDesktopCinematicMode}>
      <div className="app-shell__stage-stack" data-cinematic={isDesktopCinematicMode}>
        <section
          ref={playerSectionRef}
          className="app-shell__panel app-shell__panel--player"
          data-cinematic={isDesktopCinematicMode}
        >
          <div className="app-shell__section-heading app-shell__section-heading--player">
            <div className="app-shell__section-heading-copy">
              <p className="app-shell__section-eyebrow">Now Playing</p>
              <h2 className="app-shell__section-title">
                {selectedCountryName}
                {selectedCategoryLabel ? ` · ${selectedCategoryLabel}` : ''}
              </h2>
            </div>
            <div className="app-shell__player-actions">
              {!isMobileLayout ? (
                <button
                  aria-label={cinematicToggleLabel}
                  className="app-shell__mode-toggle"
                  data-active={isDesktopCinematicMode}
                  onClick={onToggleCinematicMode}
                  title={cinematicToggleLabel}
                  type="button"
                >
                  {cinematicToggleLabel}
                </button>
              ) : null}
            </div>
          </div>
          <div ref={playerViewportRef} className="app-shell__player-viewport">
            <VideoPlayer
              canNavigateVideos={canNavigateVideos}
              isCinematic={isDesktopCinematicMode}
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
                <p className="app-shell__stage-channel">{selectedVideoChannelTitle}</p>
                <p className="app-shell__stage-helper">{favoriteToggleHelperText}</p>
              </div>
              <div className="app-shell__stage-side">
                <div className="app-shell__stage-actions">
                  <button
                    aria-label={manualPlaybackSaveButtonLabel}
                    className="app-shell__stage-action-button"
                    disabled={isManualPlaybackSaveDisabled}
                    onClick={onManualPlaybackSave}
                    title={manualPlaybackSaveButtonLabel}
                    type="button"
                  >
                    <span className="app-shell__stage-action-icon" aria-hidden="true">
                      {manualPlaybackSaveButtonLabel === '스크랩 중...' ? (
                        '⋯'
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none">
                          <path
                            d="M7.25 5.25A1.5 1.5 0 0 1 8.75 3.75h6.5a1.5 1.5 0 0 1 1.5 1.5v15l-4.75-3-4.75 3v-15Z"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.7"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                  <button
                    aria-label={favoriteToggleLabel}
                    className="app-shell__favorite-toggle"
                    data-active={isSelectedChannelFavorited}
                    disabled={authStatus !== 'authenticated' || isFavoriteToggleDisabled}
                    onClick={onToggleFavoriteStreamer}
                    title={favoriteToggleLabel}
                    type="button"
                  >
                    <span className="app-shell__favorite-toggle-icon" aria-hidden="true">
                      {toggleFavoriteStreamerPending ? '⋯' : isSelectedChannelFavorited ? '★' : '☆'}
                    </span>
                  </button>
                  {selectedVideoStatLabel ? (
                    <span className="app-shell__stage-stat">{selectedVideoStatLabel}</span>
                  ) : null}
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
        </section>
        {cinematicQuickFiltersContent}
        {isDesktopCinematicMode ? favoriteVideosContent : null}
        {isDesktopCinematicMode ? chartContent : null}
      </div>
    </div>
  );
}

export default PlayerStage;
