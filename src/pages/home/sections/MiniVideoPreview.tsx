import { useEffect, useRef, type RefObject } from 'react';
import type { VideoPlayerHandle } from '../../../components/VideoPlayer/VideoPlayer';

let miniVideoPreviewApiPromise: Promise<void> | undefined;
let miniVideoPreviewHostElement: HTMLDivElement | null = null;
let miniVideoPreviewMountElement: HTMLDivElement | null = null;
let miniVideoPreviewPlayer: YT.Player | null = null;
let miniVideoPreviewRequestedVideoId: string | null = null;
let miniVideoPreviewIsReady = false;
let miniVideoPreviewOwnerElement: HTMLDivElement | null = null;

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

function getMiniVideoPreviewHostElement(frameClassName: string) {
  if (!miniVideoPreviewHostElement) {
    miniVideoPreviewHostElement = document.createElement('div');
    miniVideoPreviewMountElement = document.createElement('div');
    miniVideoPreviewHostElement.append(miniVideoPreviewMountElement);
  }

  miniVideoPreviewHostElement.className = frameClassName;

  return miniVideoPreviewHostElement;
}

function attachMiniVideoPreviewHost(container: HTMLDivElement, frameClassName: string) {
  const hostElement = getMiniVideoPreviewHostElement(frameClassName);

  if (hostElement.parentElement !== container) {
    container.replaceChildren(hostElement);
  }

  miniVideoPreviewOwnerElement = container;
}

function detachMiniVideoPreviewHost(container: HTMLDivElement) {
  if (miniVideoPreviewHostElement?.parentElement === container) {
    container.removeChild(miniVideoPreviewHostElement);
  }

  if (miniVideoPreviewOwnerElement === container) {
    miniVideoPreviewOwnerElement = null;
  }
}

function readMiniVideoPreviewCurrentVideoId() {
  if (
    !miniVideoPreviewPlayer ||
    !miniVideoPreviewIsReady ||
    typeof miniVideoPreviewPlayer.getVideoData !== 'function'
  ) {
    return null;
  }

  const currentVideoId = miniVideoPreviewPlayer.getVideoData()?.video_id?.trim();

  return currentVideoId || null;
}

function applyMiniVideoPreviewVideoSelection() {
  if (
    !miniVideoPreviewPlayer ||
    !miniVideoPreviewIsReady ||
    !miniVideoPreviewRequestedVideoId ||
    typeof miniVideoPreviewPlayer.loadVideoById !== 'function'
  ) {
    return;
  }

  if (readMiniVideoPreviewCurrentVideoId() === miniVideoPreviewRequestedVideoId) {
    return;
  }

  miniVideoPreviewPlayer.loadVideoById({
    startSeconds: 0,
    videoId: miniVideoPreviewRequestedVideoId,
  });
  (miniVideoPreviewPlayer as YT.Player & { mute?: () => void }).mute?.();
}

async function ensureMiniVideoPreviewPlayer(selectedVideoId: string, frameClassName: string) {
  miniVideoPreviewRequestedVideoId = selectedVideoId;

  await loadMiniVideoPreviewApi();

  if (!window.YT?.Player) {
    return;
  }

  getMiniVideoPreviewHostElement(frameClassName);

  if (miniVideoPreviewPlayer || !miniVideoPreviewMountElement) {
    applyMiniVideoPreviewVideoSelection();
    return;
  }

  miniVideoPreviewIsReady = false;
  miniVideoPreviewPlayer = new window.YT.Player(miniVideoPreviewMountElement, {
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
        miniVideoPreviewIsReady = true;
        const readyPlayer = event.target as YT.Player & { mute?: () => void };
        readyPlayer.mute?.();
        applyMiniVideoPreviewVideoSelection();
      },
    },
  });
}

export function resetMiniVideoPreviewSingletonForTests() {
  miniVideoPreviewPlayer?.destroy();
  miniVideoPreviewHostElement?.remove();
  miniVideoPreviewApiPromise = undefined;
  miniVideoPreviewHostElement = null;
  miniVideoPreviewMountElement = null;
  miniVideoPreviewPlayer = null;
  miniVideoPreviewRequestedVideoId = null;
  miniVideoPreviewIsReady = false;
  miniVideoPreviewOwnerElement = null;
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
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const previewContainer = previewContainerRef.current;

    async function initializePlayer() {
      if (isCancelled || !selectedVideoId || !previewContainer) {
        return;
      }

      attachMiniVideoPreviewHost(previewContainer, frameClassName);
      await ensureMiniVideoPreviewPlayer(selectedVideoId, frameClassName);

      if (isCancelled) {
        return;
      }

      attachMiniVideoPreviewHost(previewContainer, frameClassName);
      applyMiniVideoPreviewVideoSelection();
    }

    void initializePlayer();

    return () => {
      isCancelled = true;
      if (previewContainer) {
        detachMiniVideoPreviewHost(previewContainer);
      }
    };
  }, [frameClassName, selectedVideoId]);

  useEffect(() => {
    if (!selectedVideoId || !mainPlayerRef?.current) {
      return;
    }

    const syncPlayback = () => {
      const previewPlayer = miniVideoPreviewPlayer;
      const snapshot = mainPlayerRef.current?.readPlaybackSnapshot();

      if (
        !previewPlayer ||
        !miniVideoPreviewIsReady ||
        !snapshot ||
        snapshot.videoId !== selectedVideoId ||
        readMiniVideoPreviewCurrentVideoId() !== selectedVideoId ||
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

  return (
    <div ref={previewContainerRef} className={containerClassName} />
  );
}
