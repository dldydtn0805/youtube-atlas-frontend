import { useEffect, useRef, useState } from 'react';
import { ALL_VIDEO_CATEGORY_ID } from '../../../constants/videoCategories';
import { getCategoryPlaybackQueueId, getPlaybackQueueItems } from '../utils';
import type { VideoCategory } from '../../../constants/videoCategories';
import type { YouTubeCategorySection, YouTubeVideoItem } from '../../../features/youtube/types';

interface UsePlaybackQueueOptions {
  favoriteStreamerVideoSection?: YouTubeCategorySection;
  gamePortfolioSection?: YouTubeCategorySection;
  historyPlaybackSection?: YouTubeCategorySection;
  isMobileLayout: boolean;
  newChartEntriesSection?: YouTubeCategorySection;
  realtimeSurgingSection?: YouTubeCategorySection;
  restoredPlaybackVideo?: YouTubeVideoItem;
  scrollToPlayerTop: () => void;
  selectedCategoryId: string;
  selectedSection?: YouTubeCategorySection;
  setSelectedCategoryId: (categoryId: string) => void;
  sortedVideoCategories: VideoCategory[];
}

function usePlaybackQueue({
  favoriteStreamerVideoSection,
  gamePortfolioSection,
  historyPlaybackSection,
  isMobileLayout,
  newChartEntriesSection,
  realtimeSurgingSection,
  restoredPlaybackVideo,
  scrollToPlayerTop,
  selectedCategoryId,
  selectedSection,
  setSelectedCategoryId,
  sortedVideoCategories,
}: UsePlaybackQueueOptions) {
  const [selectedVideoId, setSelectedVideoId] = useState<string>();
  const [scrollRequestKey, setScrollRequestKey] = useState(0);
  const selectedCategoryQueueId = getCategoryPlaybackQueueId(selectedCategoryId);
  const matchedSelectedSection =
    selectedSection?.categoryId === selectedCategoryQueueId ? selectedSection : undefined;
  const autoPlayableFavoriteStreamerSection =
    selectedCategoryId === ALL_VIDEO_CATEGORY_ID ? favoriteStreamerVideoSection : undefined;
  const [activePlaybackQueueId, setActivePlaybackQueueId] = useState<string>(selectedCategoryQueueId);
  const shouldScrollToPlayerRef = useRef(false);
  const shouldAutoSelectNextAvailableRef = useRef(false);

  const activePlaybackItems = getPlaybackQueueItems(activePlaybackQueueId, {
    favoriteStreamerVideoSection: autoPlayableFavoriteStreamerSection,
    gamePortfolioSection,
    historyPlaybackSection,
    newChartEntriesSection,
    realtimeSurgingSection,
    restoredPlaybackVideo,
    selectedSection: matchedSelectedSection,
  });
  const canPlayNextVideo = activePlaybackItems.length > 1;

  function requestScrollToPlayer() {
    shouldScrollToPlayerRef.current = true;
    setScrollRequestKey((current) => current + 1);
  }

  function handleSelectVideo(
    videoId: string,
    playbackQueueId: string,
    triggerElement?: HTMLButtonElement,
  ) {
    requestScrollToPlayer();
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
      const firstVideoId = matchedSelectedSection?.items[0]?.id;

      if (firstVideoId) {
        requestScrollToPlayer();
        setActivePlaybackQueueId(getCategoryPlaybackQueueId(categoryId));
        setSelectedVideoId(firstVideoId);
      }

      triggerElement?.blur();
      return;
    }

    requestScrollToPlayer();
    shouldAutoSelectNextAvailableRef.current = true;
    setActivePlaybackQueueId(getCategoryPlaybackQueueId(categoryId));
    setSelectedCategoryId(categoryId);
    setSelectedVideoId(undefined);
    triggerElement?.blur();
  }

  function resetForRegionChange() {
    shouldAutoSelectNextAvailableRef.current = false;
    setActivePlaybackQueueId(getCategoryPlaybackQueueId(selectedCategoryId));
    setSelectedVideoId(undefined);
  }

  function restorePlaybackSelection(videoId: string, playbackQueueId: string) {
    requestScrollToPlayer();
    shouldAutoSelectNextAvailableRef.current = false;
    setActivePlaybackQueueId(playbackQueueId);
    setSelectedVideoId(videoId);
  }

  function updateActivePlaybackQueueId(queueId: string) {
    setActivePlaybackQueueId(queueId);
  }

  function handleSelectAdjacentVideo(step: number) {
    const queueItems = getPlaybackQueueItems(activePlaybackQueueId, {
      favoriteStreamerVideoSection: autoPlayableFavoriteStreamerSection,
      gamePortfolioSection,
      historyPlaybackSection,
      newChartEntriesSection,
      realtimeSurgingSection,
      restoredPlaybackVideo,
      selectedSection: matchedSelectedSection,
    });

    if (queueItems.length === 0) {
      return;
    }

    if (isMobileLayout) {
      requestScrollToPlayer();
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
    const isWaitingForSelectedCategoryQueue =
      shouldAutoSelectNextAvailableRef.current &&
      activePlaybackQueueId === selectedCategoryQueueId &&
      !matchedSelectedSection;
    const queueItems = getPlaybackQueueItems(activePlaybackQueueId, {
      favoriteStreamerVideoSection: autoPlayableFavoriteStreamerSection,
      gamePortfolioSection,
      historyPlaybackSection,
      newChartEntriesSection,
      realtimeSurgingSection,
      restoredPlaybackVideo,
      selectedSection: matchedSelectedSection,
    });
    const fallbackQueueId = isWaitingForSelectedCategoryQueue
      ? undefined
      : matchedSelectedSection?.categoryId ??
        historyPlaybackSection?.categoryId ??
        gamePortfolioSection?.categoryId ??
        autoPlayableFavoriteStreamerSection?.categoryId ??
        newChartEntriesSection?.categoryId ??
        realtimeSurgingSection?.categoryId;
    const fallbackItems =
      queueItems.length > 0
        ? queueItems
        : getPlaybackQueueItems(fallbackQueueId, {
            favoriteStreamerVideoSection: autoPlayableFavoriteStreamerSection,
            gamePortfolioSection,
            historyPlaybackSection,
            newChartEntriesSection,
            realtimeSurgingSection,
            restoredPlaybackVideo,
            selectedSection: matchedSelectedSection,
          });
    const hasSelectedVideoInQueue = queueItems.some((item) => item.id === selectedVideoId);

    if (fallbackItems.length === 0) {
      if (!isWaitingForSelectedCategoryQueue) {
        shouldAutoSelectNextAvailableRef.current = false;
      }

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
    autoPlayableFavoriteStreamerSection,
    gamePortfolioSection,
    historyPlaybackSection,
    newChartEntriesSection,
    matchedSelectedSection,
    realtimeSurgingSection,
    restoredPlaybackVideo,
    selectedCategoryQueueId,
    selectedVideoId,
  ]);

  useEffect(() => {
    if (!sortedVideoCategories.length) {
      return;
    }

    const hasSelectedCategory = sortedVideoCategories.some((category) => category.id === selectedCategoryId);

    if (!hasSelectedCategory) {
      setActivePlaybackQueueId(getCategoryPlaybackQueueId(sortedVideoCategories[0].id));
      setSelectedCategoryId(sortedVideoCategories[0].id);
      setSelectedVideoId(undefined);
    }
  }, [selectedCategoryId, setSelectedCategoryId, sortedVideoCategories]);

  useEffect(() => {
    if (!shouldScrollToPlayerRef.current) {
      return;
    }

    shouldScrollToPlayerRef.current = false;

    scrollToPlayerTop();
  }, [scrollRequestKey, scrollToPlayerTop]);

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
