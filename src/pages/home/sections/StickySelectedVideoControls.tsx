import type { ReactNode } from 'react';
import './StickySelectedVideoControls.css';

interface StickySelectedVideoControlsProps {
  isMobileLayout: boolean;
  isMobilePlayerStageStickyEnabled?: boolean;
  isPlaybackPaused?: boolean;
  onCollapsePanel?: () => void;
  onExpandPanel?: () => void;
  onJumpToTop?: () => void;
  onNextVideo?: () => void;
  onPauseVideo?: () => void;
  onPreviousVideo?: () => void;
  onResumeVideo?: () => void;
  onScrollToTop?: () => void;
  onToggleMobilePlayerStageStickyEnabled?: () => void;
}

function ControlButton({
  ariaLabel,
  children,
  isActive = false,
  isPlaybackToggle = false,
  playbackIcon,
  onClick,
  title,
}: {
  ariaLabel: string;
  children: ReactNode;
  isActive?: boolean;
  isPlaybackToggle?: boolean;
  playbackIcon?: 'pause' | 'play';
  onClick: () => void;
  title: string;
}) {
  const buttonClassName = [
    'app-shell__game-panel-action-utility',
    isPlaybackToggle ? 'app-shell__game-panel-action-utility--playback-toggle' : '',
    playbackIcon ? `app-shell__game-panel-action-utility--${playbackIcon}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      aria-label={ariaLabel}
      className={buttonClassName}
      data-active={isActive ? 'true' : undefined}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

export default function StickySelectedVideoControls({
  isMobileLayout,
  isMobilePlayerStageStickyEnabled = true,
  isPlaybackPaused = false,
  onCollapsePanel,
  onExpandPanel,
  onJumpToTop,
  onNextVideo,
  onPauseVideo,
  onPreviousVideo,
  onResumeVideo,
  onScrollToTop,
  onToggleMobilePlayerStageStickyEnabled,
}: StickySelectedVideoControlsProps) {
  const hasPlaybackControls = Boolean(
    onPreviousVideo &&
      onNextVideo &&
      ((isPlaybackPaused && onResumeVideo) || (!isPlaybackPaused && onPauseVideo)),
  );

  return (
    <>
      {hasPlaybackControls ? (
        <>
          <ControlButton ariaLabel="이전 영상" onClick={onPreviousVideo!} title="이전 영상">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M14.5 7.5 10 12l4.5 4.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </ControlButton>
          {isPlaybackPaused ? (
            <ControlButton
              ariaLabel="재생"
              isPlaybackToggle
              onClick={onResumeVideo!}
              playbackIcon="play"
              title="재생"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M8.5 6.5v11l8.75-5.5L8.5 6.5Z"
                  fill="currentColor"
                />
              </svg>
            </ControlButton>
          ) : (
            <ControlButton
              ariaLabel="일시 정지"
              isPlaybackToggle
              onClick={onPauseVideo!}
              playbackIcon="pause"
              title="일시 정지"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M8.75 6.75v10.5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.2"
                />
                <path
                  d="M15.25 6.75v10.5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.2"
                />
              </svg>
            </ControlButton>
          )}
          <ControlButton ariaLabel="다음 영상" onClick={onNextVideo!} title="다음 영상">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9.5 7.5 14 12l-4.5 4.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </ControlButton>
        </>
      ) : null}
      {isMobileLayout && onJumpToTop ? (
        <ControlButton ariaLabel="페이지 맨 위로 즉시 이동" onClick={onJumpToTop} title="맨 위로">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M7.5 13.5 12 9l4.5 4.5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path
              d="M12 9v10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path
              d="M7 5h10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        </ControlButton>
      ) : null}
      {isMobileLayout && onToggleMobilePlayerStageStickyEnabled ? (
        <ControlButton
          ariaLabel={isMobilePlayerStageStickyEnabled ? '상단 영상 스티키 끄기' : '상단 영상 스티키 켜기'}
          isActive={isMobilePlayerStageStickyEnabled}
          onClick={onToggleMobilePlayerStageStickyEnabled}
          title={isMobilePlayerStageStickyEnabled ? '상단 스티키 끄기' : '상단 스티키 켜기'}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4.75 6.75A1.75 1.75 0 0 1 6.5 5h11a1.75 1.75 0 0 1 1.75 1.75v7.5A1.75 1.75 0 0 1 17.5 16h-11a1.75 1.75 0 0 1-1.75-1.75v-7.5Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path
              d="M9.5 19h5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
            <path
              d="M12 16v3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </ControlButton>
      ) : null}
      {!isMobileLayout && onExpandPanel ? (
        <ControlButton ariaLabel="선택한 영상 패널 펼치기" onClick={onExpandPanel} title="펼치기">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 6v12M6 12h12"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </ControlButton>
      ) : null}
      {!isMobileLayout && onCollapsePanel ? (
        <ControlButton ariaLabel="선택한 영상 패널 접기" onClick={onCollapsePanel} title="접기">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 12h12"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </ControlButton>
      ) : null}
      {!isMobileLayout && onScrollToTop ? (
        <ControlButton ariaLabel="선택한 영상 패널을 맨 위로 이동" onClick={onScrollToTop} title="맨 위로">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M7.5 14.5 12 10l4.5 4.5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </ControlButton>
      ) : null}
    </>
  );
}
