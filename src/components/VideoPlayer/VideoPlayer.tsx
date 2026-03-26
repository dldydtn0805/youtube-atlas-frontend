import { useEffect, useRef } from 'react';
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
}: VideoPlayerProps) {
  const videoId = selectedVideoId;
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const onVideoEndRef = useRef(onVideoEnd);

  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);

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
    >
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
