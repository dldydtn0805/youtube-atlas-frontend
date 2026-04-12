import { useEffect, useRef, type RefObject } from 'react';
import type { VideoPlayerHandle } from '../../../components/VideoPlayer/VideoPlayer';

let miniVideoPreviewApiPromise: Promise<void> | undefined;

function loadMiniVideoPreviewApi() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (miniVideoPreviewApiPromise) {
    return miniVideoPreviewApiPromise;
  }

  miniVideoPreviewApiPromise = new Promise<void>((resolve) => {
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

  return miniVideoPreviewApiPromise;
}

interface MiniVideoPreviewProps {
  containerClassName: string;
  frameClassName: string;
  mainPlayerRef?: RefObject<VideoPlayerHandle | null>;
  selectedVideoId: string;
}

export default function MiniVideoPreview({
  containerClassName,
  frameClassName,
  mainPlayerRef,
  selectedVideoId,
}: MiniVideoPreviewProps) {
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const isReadyRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    async function initializePlayer() {
      await loadMiniVideoPreviewApi();

      if (
        isCancelled ||
        !selectedVideoId ||
        !playerHostRef.current ||
        !window.YT?.Player ||
        playerRef.current
      ) {
        return;
      }

      playerRef.current = new window.YT.Player(playerHostRef.current, {
        height: '100%',
        width: '100%',
        videoId: selectedVideoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          loop: 1,
          modestbranding: 1,
          mute: 1,
          playsinline: 1,
          playlist: selectedVideoId,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            isReadyRef.current = true;
            const readyPlayer = event.target as YT.Player & { mute?: () => void };
            readyPlayer.mute?.();
          },
        },
      });
    }

    void initializePlayer();

    return () => {
      isCancelled = true;
    };
  }, [selectedVideoId]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player || !isReadyRef.current || typeof player.loadVideoById !== 'function') {
      return;
    }

    player.loadVideoById({
      startSeconds: 0,
      videoId: selectedVideoId,
    });
    (player as YT.Player & { mute?: () => void }).mute?.();
  }, [selectedVideoId]);

  useEffect(() => {
    if (!selectedVideoId || !mainPlayerRef?.current) {
      return;
    }

    const syncPlayback = () => {
      const previewPlayer = playerRef.current;
      const snapshot = mainPlayerRef.current?.readPlaybackSnapshot();

      if (
        !previewPlayer ||
        !isReadyRef.current ||
        !snapshot ||
        snapshot.videoId !== selectedVideoId ||
        typeof previewPlayer.getCurrentTime !== 'function' ||
        typeof previewPlayer.seekTo !== 'function'
      ) {
        return;
      }

      const previewPosition = previewPlayer.getCurrentTime();
      const positionDelta = Math.abs(snapshot.positionSeconds - previewPosition);

      if (positionDelta >= 1.5) {
        previewPlayer.seekTo(Math.max(0, snapshot.positionSeconds), true);
      }
    };

    syncPlayback();
    const intervalId = window.setInterval(syncPlayback, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [mainPlayerRef, selectedVideoId]);

  useEffect(() => {
    return () => {
      isReadyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  return (
    <div className={containerClassName}>
      <div ref={playerHostRef} className={frameClassName} />
    </div>
  );
}
