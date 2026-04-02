import { useCallback, useEffect, useRef } from 'react';
import './VideoPlayer.css';

let youtubeIframeApiPromise: Promise<void> | undefined;

function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise<void>((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.append(script);
    }

    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };
  });

  return youtubeIframeApiPromise;
}

interface VideoPlayerProps {
  selectedVideoId?: string;
  isLoading?: boolean;
  isCinematic?: boolean;
  showOverlayNavigation?: boolean;
  onVideoEnd?: () => void;
  canNavigateVideos?: boolean;
  onPreviousVideo?: () => void;
  onNextVideo?: () => void;
  onPlaybackProgress?: (videoId: string, positionSeconds: number) => void;
  playbackRestore?: {
    restoreId: number;
    videoId: string;
    positionSeconds: number;
  } | null;
  onPlaybackRestoreApplied?: (restoreId: number) => void;
}

function VideoPlayer({
  selectedVideoId,
  isLoading = false,
  isCinematic = false,
  showOverlayNavigation = false,
  onVideoEnd,
  canNavigateVideos = false,
  onPreviousVideo,
  onNextVideo,
  onPlaybackProgress,
  playbackRestore,
  onPlaybackRestoreApplied,
}: VideoPlayerProps) {
  const videoId = selectedVideoId;
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const currentVideoIdRef = useRef(videoId);
  const onVideoEndRef = useRef(onVideoEnd);
  const onPlaybackProgressRef = useRef(onPlaybackProgress);
  const onPlaybackRestoreAppliedRef = useRef(onPlaybackRestoreApplied);
  const playbackRestoreRef = useRef(playbackRestore);
  const lastAppliedRestoreIdRef = useRef<number | null>(null);
  const isPlayerReadyRef = useRef(false);

  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);

  useEffect(() => {
    currentVideoIdRef.current = videoId;
  }, [videoId]);

  useEffect(() => {
    onPlaybackProgressRef.current = onPlaybackProgress;
  }, [onPlaybackProgress]);

  useEffect(() => {
    playbackRestoreRef.current = playbackRestore;
  }, [playbackRestore]);

  useEffect(() => {
    onPlaybackRestoreAppliedRef.current = onPlaybackRestoreApplied;
  }, [onPlaybackRestoreApplied]);

  const readCurrentPlaybackPositionSeconds = useCallback(() => {
    const player = playerRef.current;

    if (!player || !isPlayerReadyRef.current || typeof player.getCurrentTime !== 'function') {
      return null;
    }

    const currentTimeSeconds = player.getCurrentTime();

    if (!Number.isFinite(currentTimeSeconds) || currentTimeSeconds < 0) {
      return null;
    }

    return Math.floor(currentTimeSeconds);
  }, []);

  const readCurrentPlaybackVideoId = useCallback(() => {
    const player = playerRef.current;

    if (!player || !isPlayerReadyRef.current || typeof player.getVideoData !== 'function') {
      return undefined;
    }

    const currentPlaybackVideoId = player.getVideoData()?.video_id?.trim();

    return currentPlaybackVideoId ? currentPlaybackVideoId : undefined;
  }, []);

  const reportPlaybackProgress = useCallback(
    (progressVideoId?: string) => {
      const currentPlaybackVideoId = readCurrentPlaybackVideoId();

      if (progressVideoId && currentPlaybackVideoId && progressVideoId !== currentPlaybackVideoId) {
        return;
      }

      const resolvedVideoId = currentPlaybackVideoId ?? progressVideoId;

      if (!resolvedVideoId) {
        return;
      }

      const currentTimeSeconds = readCurrentPlaybackPositionSeconds();

      if (currentTimeSeconds === null) {
        return;
      }

      onPlaybackProgressRef.current?.(resolvedVideoId, currentTimeSeconds);
    },
    [readCurrentPlaybackPositionSeconds, readCurrentPlaybackVideoId],
  );

  function markPlaybackRestoreApplied(restoreId?: number) {
    if (!restoreId || lastAppliedRestoreIdRef.current === restoreId) {
      return;
    }

    lastAppliedRestoreIdRef.current = restoreId;
    onPlaybackRestoreAppliedRef.current?.(restoreId);
  }

  function getRestoreStartSeconds(nextVideoId?: string) {
    const restore = playbackRestoreRef.current;

    if (!nextVideoId || !restore || restore.videoId !== nextVideoId) {
      return undefined;
    }

    return Math.max(0, Math.floor(restore.positionSeconds));
  }

  useEffect(() => {
    let isCancelled = false;

    async function initializePlayer() {
      await loadYouTubeIframeApi();

      if (
        isCancelled ||
        !videoId ||
        !playerHostRef.current ||
        !window.YT?.Player ||
        playerRef.current
      ) {
        return;
      }

      const restoreStartSeconds = getRestoreStartSeconds(videoId);
      isPlayerReadyRef.current = false;

      playerRef.current = new window.YT.Player(playerHostRef.current, {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          ...(restoreStartSeconds !== undefined ? { start: restoreStartSeconds } : {}),
        },
        events: {
          onReady: () => {
            isPlayerReadyRef.current = true;

            if (restoreStartSeconds !== undefined) {
              markPlaybackRestoreApplied(playbackRestoreRef.current?.restoreId);
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT?.PlayerState.PAUSED) {
              reportPlaybackProgress();
            }

            if (event.data === window.YT?.PlayerState.ENDED) {
              reportPlaybackProgress();
              onVideoEndRef.current?.();
            }
          },
        },
      });
    }

    void initializePlayer();

    return () => {
      isCancelled = true;
    };
  }, [reportPlaybackProgress, videoId]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player || !isPlayerReadyRef.current) {
      return;
    }

    if (!videoId) {
      if (typeof player.stopVideo === 'function') {
        player.stopVideo();
      }
      return;
    }

    const restoreStartSeconds = getRestoreStartSeconds(videoId);

    if (typeof player.loadVideoById === 'function') {
      player.loadVideoById(
        restoreStartSeconds === undefined
          ? videoId
          : {
              startSeconds: restoreStartSeconds,
              videoId,
            },
      );
    }

    if (restoreStartSeconds !== undefined) {
      markPlaybackRestoreApplied(playbackRestoreRef.current?.restoreId);
    }
  }, [videoId]);

  useEffect(() => {
    const restore = playbackRestore;
    const player = playerRef.current;

    if (
      !player ||
      !isPlayerReadyRef.current ||
      !restore ||
      restore.videoId !== currentVideoIdRef.current ||
      typeof player.seekTo !== 'function'
    ) {
      return;
    }

    player.seekTo(Math.max(0, Math.floor(restore.positionSeconds)), true);
    markPlaybackRestoreApplied(restore.restoreId);
  }, [playbackRestore]);

  useEffect(() => {
    if (!videoId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const player = playerRef.current;

      if (
        !player ||
        !isPlayerReadyRef.current ||
        typeof player.getPlayerState !== 'function'
      ) {
        return;
      }

      const playerState = player.getPlayerState();

      if (
        playerState !== window.YT?.PlayerState.PLAYING &&
        playerState !== window.YT?.PlayerState.PAUSED
      ) {
        return;
      }

      reportPlaybackProgress(videoId);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
      reportPlaybackProgress(videoId);
    };
  }, [reportPlaybackProgress, videoId]);

  useEffect(() => {
    return () => {
      reportPlaybackProgress();
      isPlayerReadyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [reportPlaybackProgress]);

  return (
    <section className="video-player" data-cinematic={isCinematic}>
      <div className="video-player__frame">
        <div
          ref={playerHostRef}
          className="video-player__embed"
          data-visible={Boolean(videoId)}
        />
        {showOverlayNavigation && canNavigateVideos && videoId ? (
          <div className="video-player__overlay-nav">
            <button
              aria-label="이전 영상"
              className="video-player__overlay-button video-player__overlay-button--previous"
              onClick={onPreviousVideo}
              type="button"
            >
              <span className="video-player__overlay-icon">‹</span>
            </button>
            <button
              aria-label="다음 영상"
              className="video-player__overlay-button video-player__overlay-button--next"
              onClick={onNextVideo}
              type="button"
            >
              <span className="video-player__overlay-icon">›</span>
            </button>
          </div>
        ) : null}
        {!videoId ? (
          <div className="video-player__placeholder">
            {isLoading ? '선택한 카테고리 영상을 불러오는 중입니다.' : '재생할 영상을 선택해 주세요.'}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default VideoPlayer;
