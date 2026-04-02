import { useEffect, useRef, useState, type RefObject } from 'react';
import { getPlaybackQueueItems, scrollElementToViewportCenter } from '../utils';
import type { VideoCategory } from '../../../constants/videoCategories';
import type { YouTubeCategorySection, YouTubeVideoItem } from '../../../features/youtube/types';

interface UsePlaybackQueueOptions {
  favoriteStreamerVideoSection?: YouTubeCategorySection;
  isMobileLayout: boolean;
  playerSectionRef: RefObject<HTMLElement | null>;
  playerViewportRef: RefObject<HTMLDivElement | null>;
  realtimeSurgingSection?: YouTubeCategorySection;
  restoredPlaybackVideo?: YouTubeVideoItem;
  selectedCategoryId: string;
  selectedSection?: YouTubeCategorySection;
  setSelectedCategoryId: (categoryId: string) => void;
  sortedVideoCategories: VideoCategory[];
}

function usePlaybackQueue({
  favoriteStreamerVideoSection,
  isMobileLayout,
  playerSectionRef,
  playerViewportRef,
  realtimeSurgingSection,
  restoredPlaybackVideo,
  selectedCategoryId,
  selectedSection,
  setSelectedCategoryId,
  sortedVideoCategories,
}: UsePlaybackQueueOptions) {
  const [selectedVideoId, setSelectedVideoId] = useState<string>();
  const [activePlaybackQueueId, setActivePlaybackQueueId] = useState<string>(selectedCategoryId);
  const shouldScrollToPlayerRef = useRef(false);
  const shouldAutoSelectNextAvailableRef = useRef(false);

  const activePlaybackItems = getPlaybackQueueItems(activePlaybackQueueId, {
    favoriteStreamerVideoSection,
    realtimeSurgingSection,
    restoredPlaybackVideo,
    selectedSection,
  });
  const canPlayNextVideo = activePlaybackItems.length > 1;

  function handleSelectVideo(
    videoId: string,
    playbackQueueId: string,
    triggerElement?: HTMLButtonElement,
  ) {
    shouldScrollToPlayerRef.current = true;
    shouldAutoSelectNextAvailableRef.current = false;
    setActivePlaybackQueueId(playbackQueueId);
    setSelectedVideoId(videoId);
    triggerElement?.blur();
  }

  function handleSelectCategory(categoryId: string, triggerElement?: HTMLButtonElement) {
    if (!categoryId) {
      triggerElement?.blur();
      return;
    }

    if (categoryId === selectedCategoryId) {
      const firstVideoId = selectedSection?.items[0]?.id;

      if (firstVideoId) {
        shouldScrollToPlayerRef.current = true;
        setActivePlaybackQueueId(categoryId);
        setSelectedVideoId(firstVideoId);
      }

      triggerElement?.blur();
      return;
    }

    shouldScrollToPlayerRef.current = true;
    shouldAutoSelectNextAvailableRef.current = true;
    setActivePlaybackQueueId(categoryId);
    setSelectedCategoryId(categoryId);
    setSelectedVideoId(undefined);
    triggerElement?.blur();
  }

  function resetForRegionChange() {
    shouldAutoSelectNextAvailableRef.current = false;
    setActivePlaybackQueueId(selectedCategoryId);
    setSelectedVideoId(undefined);
  }

  function restorePlaybackSelection(videoId: string, playbackQueueId: string) {
    shouldScrollToPlayerRef.current = true;
    shouldAutoSelectNextAvailableRef.current = false;
    setActivePlaybackQueueId(playbackQueueId);
    setSelectedVideoId(videoId);
  }

  function updateActivePlaybackQueueId(queueId: string) {
    setActivePlaybackQueueId(queueId);
  }

  function handleSelectAdjacentVideo(step: number) {
    const queueItems = getPlaybackQueueItems(activePlaybackQueueId, {
      favoriteStreamerVideoSection,
      realtimeSurgingSection,
      restoredPlaybackVideo,
      selectedSection,
    });

    if (queueItems.length === 0) {
      return;
    }

    if (isMobileLayout) {
      shouldScrollToPlayerRef.current = true;
    }

    const currentIndex = queueItems.findIndex((item) => item.id === selectedVideoId);
    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + step + queueItems.length) % queueItems.length
        : step >= 0
          ? 0
          : queueItems.length - 1;

    setSelectedVideoId(queueItems[nextIndex]?.id);
  }

  function handlePlayNextVideo() {
    handleSelectAdjacentVideo(1);
  }

  function handlePlayPreviousVideo() {
    handleSelectAdjacentVideo(-1);
  }

  useEffect(() => {
    const queueItems = getPlaybackQueueItems(activePlaybackQueueId, {
      favoriteStreamerVideoSection,
      realtimeSurgingSection,
      restoredPlaybackVideo,
      selectedSection,
    });
    const fallbackQueueId =
      selectedSection?.categoryId ??
      favoriteStreamerVideoSection?.categoryId ??
      realtimeSurgingSection?.categoryId;
    const fallbackItems =
      queueItems.length > 0
        ? queueItems
        : getPlaybackQueueItems(fallbackQueueId, {
            favoriteStreamerVideoSection,
            realtimeSurgingSection,
            restoredPlaybackVideo,
            selectedSection,
          });
    const hasSelectedVideoInQueue = queueItems.some((item) => item.id === selectedVideoId);

    if (fallbackItems.length === 0) {
      shouldAutoSelectNextAvailableRef.current = false;
      setSelectedVideoId(undefined);
      return;
    }

    if (!hasSelectedVideoInQueue) {
      const shouldAutoSelectFallback =
        Boolean(selectedVideoId) || shouldAutoSelectNextAvailableRef.current;

      if (queueItems.length === 0 && fallbackQueueId && activePlaybackQueueId !== fallbackQueueId) {
        setActivePlaybackQueueId(fallbackQueueId);
      }

      if (shouldAutoSelectFallback) {
        shouldAutoSelectNextAvailableRef.current = false;
        setSelectedVideoId(fallbackItems[0]?.id);
      }
    }
  }, [
    activePlaybackQueueId,
    favoriteStreamerVideoSection,
    realtimeSurgingSection,
    restoredPlaybackVideo,
    selectedSection,
    selectedVideoId,
  ]);

  useEffect(() => {
    if (!sortedVideoCategories.length) {
      return;
    }

    const hasSelectedCategory = sortedVideoCategories.some((category) => category.id === selectedCategoryId);

    if (!hasSelectedCategory) {
      setActivePlaybackQueueId(sortedVideoCategories[0].id);
      setSelectedCategoryId(sortedVideoCategories[0].id);
      setSelectedVideoId(undefined);
    }
  }, [selectedCategoryId, setSelectedCategoryId, sortedVideoCategories]);

  useEffect(() => {
    if (!selectedVideoId || !shouldScrollToPlayerRef.current) {
      return;
    }

    shouldScrollToPlayerRef.current = false;

    window.setTimeout(() => {
      const playerSection = isMobileLayout ? playerViewportRef.current : playerSectionRef.current;

      if (!playerSection) {
        return;
      }

      if (isMobileLayout) {
        scrollElementToViewportCenter(playerSection);
        return;
      }

      playerSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }, [isMobileLayout, playerSectionRef, playerViewportRef, selectedVideoId]);

  return {
    canPlayNextVideo,
    handlePlayNextVideo,
    handlePlayPreviousVideo,
    handleSelectCategory,
    handleSelectVideo,
    resetForRegionChange,
    restorePlaybackSelection,
    selectedVideoId,
    updateActivePlaybackQueueId,
    activePlaybackQueueId,
  };
}

export default usePlaybackQueue;
