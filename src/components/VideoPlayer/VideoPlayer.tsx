import { TouchEvent, useEffect, useRef } from 'react';
import './VideoPlayer.css';

let youtubeIframeApiPromise: Promise<void> | undefined;
const EDGE_SWIPE_DISTANCE_THRESHOLD = 56;
const EDGE_DIRECTION_LOCK_THRESHOLD = 12;

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
  isMobileCinematic?: boolean;
  isPortrait?: boolean;
  onVideoEnd?: () => void;
  canNavigateVideos?: boolean;
  onPreviousVideo?: () => void;
  onNextVideo?: () => void;
}

function VideoPlayer({
  selectedVideoId,
  isLoading = false,
  isCinematic = false,
  isMobileCinematic = false,
  isPortrait = false,
  onVideoEnd,
  canNavigateVideos = false,
  onPreviousVideo,
  onNextVideo,
}: VideoPlayerProps) {
  const videoId = selectedVideoId;
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const onVideoEndRef = useRef(onVideoEnd);
  const ignoreEdgeClickRef = useRef(false);
  const edgeSwipeRef = useRef<{
    direction: 'previous' | 'next';
    startX: number;
    startY: number;
    axis: 'horizontal' | 'vertical' | null;
  } | null>(null);

  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);

  function resetEdgeSwipe() {
    edgeSwipeRef.current = null;
  }

  function handleEdgeTouchStart(direction: 'previous' | 'next', event: TouchEvent<HTMLButtonElement>) {
    if (!isMobileCinematic || !canNavigateVideos || event.touches.length !== 1) {
      resetEdgeSwipe();
      return;
    }

    const touch = event.touches[0];
    edgeSwipeRef.current = {
      direction,
      startX: touch.clientX,
      startY: touch.clientY,
      axis: null,
    };
  }

  function handleEdgeTouchMove(event: TouchEvent<HTMLButtonElement>) {
    const swipe = edgeSwipeRef.current;

    if (!swipe || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - swipe.startX;
    const deltaY = touch.clientY - swipe.startY;

    if (!swipe.axis) {
      if (
        Math.abs(deltaX) < EDGE_DIRECTION_LOCK_THRESHOLD &&
        Math.abs(deltaY) < EDGE_DIRECTION_LOCK_THRESHOLD
      ) {
        return;
      }

      swipe.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }

    if (swipe.axis === 'horizontal') {
      event.preventDefault();
    }
  }

  function handleEdgeTouchEnd(event: TouchEvent<HTMLButtonElement>) {
    const swipe = edgeSwipeRef.current;

    if (!swipe) {
      return;
    }

    const touch = event.changedTouches[0];

    if (!touch) {
      resetEdgeSwipe();
      return;
    }

    const deltaX = touch.clientX - swipe.startX;
    const deltaY = touch.clientY - swipe.startY;
    const isHorizontalSwipe =
      Math.abs(deltaX) >= EDGE_SWIPE_DISTANCE_THRESHOLD &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    const shouldNavigate =
      swipe.direction === 'next' ? deltaX <= -EDGE_SWIPE_DISTANCE_THRESHOLD : deltaX >= EDGE_SWIPE_DISTANCE_THRESHOLD;

    resetEdgeSwipe();

    if (!isHorizontalSwipe || !shouldNavigate) {
      return;
    }

    ignoreEdgeClickRef.current = true;

    if (swipe.direction === 'next') {
      onNextVideo?.();
      return;
    }

    onPreviousVideo?.();
  }

  function handleEdgeClick(direction: 'previous' | 'next') {
    if (ignoreEdgeClickRef.current) {
      ignoreEdgeClickRef.current = false;
      return;
    }

    if (direction === 'next') {
      onNextVideo?.();
      return;
    }

    onPreviousVideo?.();
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

      playerRef.current = new window.YT.Player(playerHostRef.current, {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
        },
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT?.PlayerState.ENDED) {
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
  }, [videoId]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    if (!videoId) {
      player.stopVideo();
      return;
    }

    player.loadVideoById(videoId);
  }, [videoId]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  return (
    <section
      className="video-player"
      data-cinematic={isCinematic}
      data-orientation={isPortrait ? 'portrait' : 'landscape'}
    >
      <div className="video-player__frame">
        <div
          ref={playerHostRef}
          className="video-player__embed"
          data-visible={Boolean(videoId)}
        />
        {isMobileCinematic && canNavigateVideos && videoId ? (
          <div className="video-player__edge-controls">
            <button
              aria-label="이전 영상"
              className="video-player__edge-zone video-player__edge-zone--previous"
              onClick={() => handleEdgeClick('previous')}
              onTouchCancel={resetEdgeSwipe}
              onTouchEnd={handleEdgeTouchEnd}
              onTouchMove={handleEdgeTouchMove}
              onTouchStart={(event) => handleEdgeTouchStart('previous', event)}
              type="button"
            >
              <span className="video-player__edge-hint">‹</span>
            </button>
            <button
              aria-label="다음 영상"
              className="video-player__edge-zone video-player__edge-zone--next"
              onClick={() => handleEdgeClick('next')}
              onTouchCancel={resetEdgeSwipe}
              onTouchEnd={handleEdgeTouchEnd}
              onTouchMove={handleEdgeTouchMove}
              onTouchStart={(event) => handleEdgeTouchStart('next', event)}
              type="button"
            >
              <span className="video-player__edge-hint">›</span>
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
