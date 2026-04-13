import { useMemo } from 'react';
import type { VideoCategory } from '../../../constants/videoCategories';
import { useVideoById } from '../../../features/youtube/queries';
import type { YouTubeCategorySection, YouTubeVideoItem } from '../../../features/youtube/types';
import { isApiConfigured } from '../../../lib/api';
import usePlaybackQueue from './usePlaybackQueue';
import { mergeUniqueVideoItems } from '../utils';

interface UseHomePlaybackStateOptions {
  favoriteStreamerVideoSection?: YouTubeCategorySection;
  gamePortfolioSection: YouTubeCategorySection;
  historyPlaybackSection?: YouTubeCategorySection;
  isMobileLayout: boolean;
  newChartEntriesSection?: YouTubeCategorySection;
  realtimeSurgingSection?: YouTubeCategorySection;
  scrollToPlayerTop: () => void;
  selectedCategoryId: string;
  selectedPlaybackSection?: YouTubeCategorySection;
  setSelectedCategoryId: (categoryId: string) => void;
  sortedVideoCategories: VideoCategory[];
}

interface UseHomePlaybackStateResult {
  canPlayNextVideo: boolean;
  handlePlayNextVideo: () => void;
  handlePlayPreviousVideo: () => void;
  handleSelectCategory: (
    categoryId: string,
    triggerElement?: HTMLButtonElement,
  ) => void;
  handleSelectVideo: (
    videoId: string,
    playbackQueueId: string,
    triggerElement?: HTMLButtonElement,
  ) => void;
  resetForRegionChange: () => void;
  resolvedSelectedVideo?: YouTubeVideoItem;
  selectedVideoId?: string;
}

export default function useHomePlaybackState({
  favoriteStreamerVideoSection,
  gamePortfolioSection,
  historyPlaybackSection,
  isMobileLayout,
  newChartEntriesSection,
  realtimeSurgingSection,
  scrollToPlayerTop,
  selectedCategoryId,
  selectedPlaybackSection,
  setSelectedCategoryId,
  sortedVideoCategories,
}: UseHomePlaybackStateOptions): UseHomePlaybackStateResult {
  const combinedPlayableItems = useMemo(
    () =>
      mergeUniqueVideoItems(
        realtimeSurgingSection?.items,
        newChartEntriesSection?.items,
        selectedPlaybackSection?.items,
        favoriteStreamerVideoSection?.items,
        gamePortfolioSection.items,
        historyPlaybackSection?.items,
      ),
    [
      favoriteStreamerVideoSection?.items,
      gamePortfolioSection.items,
      historyPlaybackSection?.items,
      newChartEntriesSection?.items,
      realtimeSurgingSection?.items,
      selectedPlaybackSection?.items,
    ],
  );
  const {
    canPlayNextVideo,
    handlePlayNextVideo,
    handlePlayPreviousVideo,
    handleSelectCategory,
    handleSelectVideo,
    resetForRegionChange,
    selectedVideoId,
  } = usePlaybackQueue({
    favoriteStreamerVideoSection,
    gamePortfolioSection,
    historyPlaybackSection,
    isMobileLayout,
    newChartEntriesSection,
    realtimeSurgingSection,
    scrollToPlayerTop,
    selectedCategoryId,
    selectedSection: selectedPlaybackSection,
    setSelectedCategoryId,
    sortedVideoCategories,
  });
  const selectedVideo = combinedPlayableItems.find((item) => item.id === selectedVideoId);
  const shouldLoadSelectedVideoDetail =
    isApiConfigured &&
    Boolean(selectedVideoId) &&
    (!selectedVideo?.statistics?.viewCount || !selectedVideo?.snippet.channelId?.trim());
  const { data: selectedVideoDetail } = useVideoById(selectedVideoId, shouldLoadSelectedVideoDetail);
  const resolvedSelectedVideo =
    selectedVideo && selectedVideoDetail
      ? {
          ...selectedVideoDetail,
          ...selectedVideo,
          statistics: selectedVideo.statistics ?? selectedVideoDetail.statistics,
          snippet: {
            ...selectedVideoDetail.snippet,
            ...selectedVideo.snippet,
            channelId: selectedVideo.snippet.channelId || selectedVideoDetail.snippet.channelId,
            channelTitle: selectedVideo.snippet.channelTitle || selectedVideoDetail.snippet.channelTitle,
            title: selectedVideo.snippet.title || selectedVideoDetail.snippet.title,
          },
        }
      : selectedVideoDetail ?? selectedVideo;

  return {
    canPlayNextVideo,
    handlePlayNextVideo,
    handlePlayPreviousVideo,
    handleSelectCategory,
    handleSelectVideo,
    resetForRegionChange,
    resolvedSelectedVideo,
    selectedVideoId,
  };
}
