import { useEffect, useRef, useState } from 'react';
import { ALL_VIDEO_CATEGORY_ID } from '../../../constants/videoCategories';
import { getCategoryPlaybackQueueId, getPlaybackQueueItems } from '../utils';
import type { VideoCategory } from '../../../constants/videoCategories';
import type { YouTubeCategorySection, YouTubeVideoItem } from '../../../features/youtube/types';

const INITIAL_RANDOM_PLAYBACK_LIMIT = 50;

interface UsePlaybackQueueOptions {
  autoSelectFirstVideoWhenEmpty?: boolean;
  extraPlaybackSections?: YouTubeCategorySection[];
  favoriteStreamerVideoSection?: YouTubeCategorySection;
  gamePortfolioSection?: YouTubeCategorySection;
  historyPlaybackSection?: YouTubeCategorySection;
  isMobileLayout: boolean;
  newChartEntriesSection?: YouTubeCategorySection;
  preferredInitialPlaybackFallbackSection?: YouTubeCategorySection;
  preferredInitialPlaybackFallbackSectionLoading?: boolean;
  preferredInitialPlaybackSection?: YouTubeCategorySection;
  preferredInitialPlaybackSectionLoading?: boolean;
  preferredInitialPlaybackSectionSelectionKey?: string | null;
  preserveSelectedVideoWhenQueueChanges?: boolean;
  realtimeSurgingSection?: YouTubeCategorySection;
  restoredPlaybackVideo?: YouTubeVideoItem;
  scrollToPlayerTop: () => void;
  selectedCategoryId: string;
  selectedSection?: YouTubeCategorySection;
  setSelectedCategoryId: (categoryId: string) => void;
  sortedVideoCategories: VideoCategory[];
}

function pickRandomInitialVideoId(items: YouTubeVideoItem[]) {
  const candidateCount = Math.min(items.length, INITIAL_RANDOM_PLAYBACK_LIMIT);

  if (candidateCount === 0) {
    return undefined;
  }

  const selectedIndex = Math.min(Math.floor(Math.random() * candidateCount), candidateCount - 1);

  return items[selectedIndex]?.id;
}

function usePlaybackQueue({
  autoSelectFirstVideoWhenEmpty = false,
  extraPlaybackSections,
  favoriteStreamerVideoSection,
  gamePortfolioSection,
  historyPlaybackSection,
  isMobileLayout,
  newChartEntriesSection,
  preferredInitialPlaybackFallbackSection,
  preferredInitialPlaybackFallbackSectionLoading = false,
  preferredInitialPlaybackSection,
  preferredInitialPlaybackSectionLoading = false,
  preferredInitialPlaybackSectionSelectionKey,
  preserveSelectedVideoWhenQueueChanges = false,
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
  const handledPreferredInitialSelectionKeyRef = useRef<string | null>(null);

  const activePlaybackItems = getPlaybackQueueItems(activePlaybackQueueId, {
    extraSections: extraPlaybackSections,
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
    if (isMobileLayout) {
      return;
    }

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

  function syncPlaybackSelection(videoId: string, playbackQueueId: string) {
    shouldAutoSelectNextAvailableRef.current = false;
    setActivePlaybackQueueId(playbackQueueId);
    setSelectedVideoId(videoId);
  }

  function updateActivePlaybackQueueId(queueId: string) {
    setActivePlaybackQueueId(queueId);
  }

  function handleSelectAdjacentVideo(step: number) {
    const queueItems = getPlaybackQueueItems(activePlaybackQueueId, {
      extraSections: extraPlaybackSections,
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
      extraSections: extraPlaybackSections,
      favoriteStreamerVideoSection: autoPlayableFavoriteStreamerSection,
      gamePortfolioSection,
      historyPlaybackSection,
      newChartEntriesSection,
      realtimeSurgingSection,
      restoredPlaybackVideo,
      selectedSection: matchedSelectedSection,
    });
    const shouldPreferInitialPlaybackSection =
      autoSelectFirstVideoWhenEmpty &&
      !selectedVideoId &&
      !shouldAutoSelectNextAvailableRef.current &&
      activePlaybackQueueId === selectedCategoryQueueId;
    const hasPreferredInitialVideo = (preferredInitialPlaybackSection?.items.length ?? 0) > 0;
    const preferredInitialFallbackVideoId = preferredInitialPlaybackFallbackSection?.items[0]?.id;
    const shouldApplyPreferredInitialSelection =
      Boolean(preferredInitialPlaybackSectionSelectionKey) &&
      handledPreferredInitialSelectionKeyRef.current !== preferredInitialPlaybackSectionSelectionKey;
    const preferredInitialTargetSection =
      hasPreferredInitialVideo && preferredInitialPlaybackSection?.categoryId
        ? preferredInitialPlaybackSection
        : preferredInitialFallbackVideoId && preferredInitialPlaybackFallbackSection?.categoryId
          ? preferredInitialPlaybackFallbackSection
          : undefined;
    const preferredInitialTargetVideoId =
      preferredInitialTargetSection === preferredInitialPlaybackSection && preferredInitialPlaybackSection
        ? pickRandomInitialVideoId(preferredInitialPlaybackSection.items)
        : preferredInitialFallbackVideoId;

    if (!preferredInitialPlaybackSectionSelectionKey) {
      handledPreferredInitialSelectionKeyRef.current = null;
    }

    if (
      shouldApplyPreferredInitialSelection &&
      (preferredInitialPlaybackSectionLoading ||
        (!hasPreferredInitialVideo && preferredInitialPlaybackFallbackSectionLoading))
    ) {
      return;
    }

    if (
      shouldApplyPreferredInitialSelection &&
      preferredInitialTargetVideoId &&
      preferredInitialTargetSection?.categoryId
    ) {
      handledPreferredInitialSelectionKeyRef.current = preferredInitialPlaybackSectionSelectionKey ?? null;
      setActivePlaybackQueueId(preferredInitialTargetSection.categoryId);
      setSelectedVideoId(preferredInitialTargetVideoId);
      return;
    }

    if (shouldPreferInitialPlaybackSection && preferredInitialPlaybackSectionLoading) {
      return;
    }

    if (
      shouldPreferInitialPlaybackSection &&
      preferredInitialTargetVideoId &&
      preferredInitialTargetSection === preferredInitialPlaybackSection &&
      preferredInitialPlaybackSection?.categoryId
    ) {
      setActivePlaybackQueueId(preferredInitialPlaybackSection.categoryId);
      setSelectedVideoId(preferredInitialTargetVideoId);
      return;
    }

    const fallbackQueueId = isWaitingForSelectedCategoryQueue
      ? undefined
      : matchedSelectedSection?.categoryId ??
        historyPlaybackSection?.categoryId ??
        gamePortfolioSection?.categoryId ??
        autoPlayableFavoriteStreamerSection?.categoryId ??
        extraPlaybackSections?.find((section) => section.items.length > 0)?.categoryId ??
        newChartEntriesSection?.categoryId ??
        realtimeSurgingSection?.categoryId;
    const fallbackItems =
      queueItems.length > 0
        ? queueItems
        : getPlaybackQueueItems(fallbackQueueId, {
            extraSections: extraPlaybackSections,
            favoriteStreamerVideoSection: autoPlayableFavoriteStreamerSection,
            gamePortfolioSection,
            historyPlaybackSection,
            newChartEntriesSection,
            realtimeSurgingSection,
            restoredPlaybackVideo,
            selectedSection: matchedSelectedSection,
          });
    const hasSelectedVideoInQueue = queueItems.some((item) => item.id === selectedVideoId);
    const shouldKeepMissingSelectedVideo =
      preserveSelectedVideoWhenQueueChanges &&
      Boolean(selectedVideoId) &&
      !shouldAutoSelectNextAvailableRef.current;

    if (fallbackItems.length === 0) {
      if (!isWaitingForSelectedCategoryQueue) {
        shouldAutoSelectNextAvailableRef.current = false;
      }

      if (!shouldKeepMissingSelectedVideo) {
        setSelectedVideoId(undefined);
      }
      return;
    }

    if (!hasSelectedVideoInQueue) {
      const shouldAutoSelectFallback =
        (!shouldKeepMissingSelectedVideo && Boolean(selectedVideoId)) ||
        shouldAutoSelectNextAvailableRef.current ||
        (!selectedVideoId && autoSelectFirstVideoWhenEmpty);

      if (
        !shouldKeepMissingSelectedVideo &&
        queueItems.length === 0 &&
        fallbackQueueId &&
        activePlaybackQueueId !== fallbackQueueId
      ) {
        setActivePlaybackQueueId(fallbackQueueId);
      }

      if (shouldAutoSelectFallback) {
        const nextVideoId =
          !selectedVideoId &&
          autoSelectFirstVideoWhenEmpty &&
          !shouldAutoSelectNextAvailableRef.current
            ? pickRandomInitialVideoId(fallbackItems)
            : fallbackItems[0]?.id;

        shouldAutoSelectNextAvailableRef.current = false;
        setSelectedVideoId(nextVideoId);
      }
    }
  }, [
    activePlaybackQueueId,
    autoSelectFirstVideoWhenEmpty,
    autoPlayableFavoriteStreamerSection,
    extraPlaybackSections,
    gamePortfolioSection,
    historyPlaybackSection,
    newChartEntriesSection,
    matchedSelectedSection,
    preferredInitialPlaybackFallbackSection,
    preferredInitialPlaybackFallbackSectionLoading,
    preferredInitialPlaybackSection,
    preferredInitialPlaybackSectionLoading,
    preferredInitialPlaybackSectionSelectionKey,
    preserveSelectedVideoWhenQueueChanges,
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
    syncPlaybackSelection,
    selectedVideoId,
    updateActivePlaybackQueueId,
    activePlaybackQueueId,
  };
}

export default usePlaybackQueue;
