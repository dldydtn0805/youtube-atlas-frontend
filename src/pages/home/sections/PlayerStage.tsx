import type { ReactNode, RefObject } from 'react';
import VideoPlayer, { type VideoPlayerHandle } from '../../../components/VideoPlayer/VideoPlayer';
import type { AuthStatus } from '../../../features/auth/types';
import type { PendingPlaybackRestore } from '../utils';

interface PlayerStageProps {
  authStatus: AuthStatus;
  canNavigateVideos: boolean;
  chartContent?: ReactNode;
  cinematicToggleLabel: string;
  favoriteToggleHelperText: string;
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
  selectedCategoryLabel?: string;
  selectedCountryName: string;
  selectedVideoChannelTitle?: string;
  selectedVideoId?: string;
  selectedVideoPriceLabel?: string;
  selectedVideoRankLabel?: string;
  selectedVideoRankTrendLabel?: string;
  selectedVideoRankTrendTone?: 'up' | 'down' | 'steady' | 'new';
  selectedVideoStatLabel?: string;
  selectedVideoTitle?: string;
  stageActionContent?: ReactNode;
  supplementalContent?: ReactNode;
  toggleFavoriteStreamerPending: boolean;
}

function PlayerStage({
  authStatus,
  canNavigateVideos,
  chartContent,
  cinematicToggleLabel,
  favoriteToggleHelperText,
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
  selectedCategoryLabel,
  selectedCountryName,
  selectedVideoChannelTitle,
  selectedVideoId,
  selectedVideoPriceLabel,
  selectedVideoRankLabel,
  selectedVideoRankTrendLabel,
  selectedVideoRankTrendTone,
  selectedVideoStatLabel,
  selectedVideoTitle,
  stageActionContent,
  supplementalContent,
  toggleFavoriteStreamerPending,
}: PlayerStageProps) {
  const hasSelectedVideo = Boolean(selectedVideoId);

  return (
    <div ref={playerStageRef} className="app-shell__stage" data-cinematic={isCinematicModeActive}>
      <div className="app-shell__stage-stack" data-cinematic={isCinematicModeActive}>
        <section
          ref={playerSectionRef}
          className="app-shell__panel app-shell__panel--player"
          data-cinematic={isCinematicModeActive}
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
          </div>
          <div ref={playerViewportRef} className="app-shell__player-viewport">
            <VideoPlayer
              canNavigateVideos={canNavigateVideos}
              isCinematic={isCinematicModeActive}
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
                  {stageActionContent}
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
                  <button
                    aria-label={favoriteToggleLabel}
                    className="app-shell__stage-action-button app-shell__stage-action-button--favorite"
                    data-active={isSelectedChannelFavorited}
                    disabled={authStatus !== 'authenticated' || isFavoriteToggleDisabled}
                    onClick={onToggleFavoriteStreamer}
                    title={favoriteToggleLabel}
                    type="button"
                  >
                    <span className="app-shell__stage-action-icon" aria-hidden="true">
                      {toggleFavoriteStreamerPending ? (
                        '⋯'
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill={isSelectedChannelFavorited ? 'currentColor' : 'none'}
                        >
                          <path
                            d="m12 3.75 2.55 5.17 5.7.83-4.13 4.03.97 5.68L12 16.78l-5.09 2.68.97-5.68-4.13-4.03 5.7-.83L12 3.75Z"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.7"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                  {selectedVideoRankLabel || selectedVideoStatLabel || selectedVideoPriceLabel ? (
                    <div className="app-shell__stage-stats">
                      {selectedVideoPriceLabel ? (
                        <span className="app-shell__stage-stat">{selectedVideoPriceLabel}</span>
                      ) : null}
                      {selectedVideoStatLabel ? (
                        <span className="app-shell__stage-stat">{selectedVideoStatLabel}</span>
                      ) : null}
                      {selectedVideoRankLabel ? (
                        <span className="app-shell__stage-stat">
                          <span>{selectedVideoRankLabel}</span>
                          {selectedVideoRankTrendLabel ? (
                            <span
                              className="app-shell__stage-rank-trend"
                              data-tone={selectedVideoRankTrendTone}
                            >
                              {selectedVideoRankTrendLabel}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </div>
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
          {supplementalContent}
        </section>
        {isCinematicModeActive ? filterContent : null}
        {isCinematicModeActive ? chartContent : null}
      </div>
    </div>
  );
}

export default PlayerStage;
