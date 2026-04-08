import { useMemo } from 'react';
import type { FeaturedVideoSection } from '../../../components/VideoList/VideoList';
import { ALL_VIDEO_CATEGORY_ID, supportsVideoTrendSignals } from '../../../constants/videoCategories';
import type { GameCurrentSeason, GameMarketVideo } from '../../../features/game/types';
import { useNewChartEntries, useRealtimeSurging, useVideoTrendSignals } from '../../../features/trending/queries';
import type { VideoTrendSignal } from '../../../features/trending/types';
import type { YouTubeCategorySection, YouTubeVideoItem } from '../../../features/youtube/types';
import {
  BUYABLE_ONLY_PREFETCH_LIMIT,
  buildNewChartEntriesSection,
  buildRealtimeSurgingSection,
  filterVideoSection,
  shouldPrefetchBuyableVideos,
  shouldRenderRealtimeSurgingSection,
} from '../utils';

interface UseHomeTrendSectionsOptions {
  canShowGameActions: boolean;
  currentGameSeason?: GameCurrentSeason;
  favoriteStreamerVideoSection?: YouTubeCategorySection;
  gameMarket: GameMarketVideo[];
  hasNextPage: boolean;
  isAllCategorySelected: boolean;
  isApiConfigured: boolean;
  isAuthenticated: boolean;
  isBuyableOnlyFilterActive: boolean;
  isChartError: boolean;
  isChartLoading: boolean;
  isFetchingNextPage: boolean;
  isGameMarketLoading: boolean;
  loadedSelectedVideoCount: number;
  selectedCategoryId?: string;
  selectedPlaybackSection?: YouTubeCategorySection;
  selectedRegionCode: string;
  shouldLoadFavorites: boolean;
}

interface UseHomeTrendSectionsResult {
  buyableVideoSearchStatus?: string;
  chartTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  favoriteTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  featuredChartSections: FeaturedVideoSection[];
  filteredSelectedPlaybackSection?: YouTubeCategorySection;
  hasResolvedChartTrendSignals: boolean;
  hasResolvedFavoriteTrendSignals: boolean;
  isBuyableOnlyFilterAvailable: boolean;
  isBuyableVideoSearchLoading: boolean;
  isNewChartEntriesError: boolean;
  isNewChartEntriesLoading: boolean;
  isRealtimeSurgingError: boolean;
  isRealtimeSurgingLoading: boolean;
  newChartEntriesSection?: YouTubeCategorySection;
  realtimeSurgingSection?: YouTubeCategorySection;
  shouldAutoPrefetchBuyableVideos: boolean;
}

function mapSignalsByVideoId(signals?: VideoTrendSignal[]) {
  return Object.fromEntries((signals ?? []).map((signal) => [signal.videoId, signal]));
}

function getSectionRankLabel(
  item: YouTubeVideoItem,
  signalsByVideoId: Record<string, VideoTrendSignal>,
  fallbackLabel: string,
) {
  const signal = signalsByVideoId[item.id];

  if (!signal?.currentRank) {
    return fallbackLabel;
  }

  return `${signal.currentRank}위`;
}

export default function useHomeTrendSections({
  canShowGameActions,
  currentGameSeason,
  favoriteStreamerVideoSection,
  gameMarket,
  hasNextPage,
  isAllCategorySelected,
  isApiConfigured,
  isAuthenticated,
  isBuyableOnlyFilterActive,
  isChartError,
  isChartLoading,
  isFetchingNextPage,
  isGameMarketLoading,
  loadedSelectedVideoCount,
  selectedCategoryId,
  selectedPlaybackSection,
  selectedRegionCode,
  shouldLoadFavorites,
}: UseHomeTrendSectionsOptions): UseHomeTrendSectionsResult {
  const selectedSectionVideoIds = selectedPlaybackSection?.items.map((item) => item.id) ?? [];
  const favoriteStreamerVideoIds = favoriteStreamerVideoSection?.items.map((item) => item.id) ?? [];
  const shouldShowSelectedCategoryTrendSignals = supportsVideoTrendSignals(
    selectedCategoryId,
    selectedRegionCode,
  );
  const shouldShowAllCategoryTrendSignals = supportsVideoTrendSignals(
    ALL_VIDEO_CATEGORY_ID,
    selectedRegionCode,
  );
  const shouldShowRealtimeSurging = shouldRenderRealtimeSurgingSection(
    isAllCategorySelected,
    shouldShowAllCategoryTrendSignals,
  );

  const {
    data: trendSignalsByVideoId = {},
    isLoading: isTrendSignalsLoading,
    isError: isTrendSignalsError,
  } = useVideoTrendSignals(
    selectedRegionCode,
    selectedCategoryId,
    selectedSectionVideoIds,
    isApiConfigured && shouldShowSelectedCategoryTrendSignals,
  );
  const {
    data: favoriteTrendSignalsByVideoId = {},
    isLoading: isFavoriteTrendSignalsLoading,
    isError: isFavoriteTrendSignalsError,
  } = useVideoTrendSignals(
    selectedRegionCode,
    ALL_VIDEO_CATEGORY_ID,
    favoriteStreamerVideoIds,
    shouldLoadFavorites &&
      shouldShowAllCategoryTrendSignals &&
      favoriteStreamerVideoIds.length > 0,
  );
  const {
    data: realtimeSurgingData,
    isLoading: isRealtimeSurgingLoading,
    isError: isRealtimeSurgingError,
  } = useRealtimeSurging(selectedRegionCode, isApiConfigured && shouldShowRealtimeSurging);
  const {
    data: newChartEntriesData,
    isLoading: isNewChartEntriesLoading,
    isError: isNewChartEntriesError,
  } = useNewChartEntries(selectedRegionCode, isApiConfigured && shouldShowRealtimeSurging);

  const realtimeSurgingSignalsByVideoId = useMemo(
    () => mapSignalsByVideoId(realtimeSurgingData?.items),
    [realtimeSurgingData?.items],
  );
  const newChartEntriesSignalsByVideoId = useMemo(
    () => mapSignalsByVideoId(newChartEntriesData?.items),
    [newChartEntriesData?.items],
  );
  const chartTrendSignalsByVideoId = useMemo(
    () =>
      shouldShowSelectedCategoryTrendSignals
        ? {
            ...trendSignalsByVideoId,
            ...(isAllCategorySelected ? realtimeSurgingSignalsByVideoId : {}),
            ...(isAllCategorySelected ? newChartEntriesSignalsByVideoId : {}),
          }
        : {},
    [
      isAllCategorySelected,
      newChartEntriesSignalsByVideoId,
      realtimeSurgingSignalsByVideoId,
      shouldShowSelectedCategoryTrendSignals,
      trendSignalsByVideoId,
    ],
  );
  const realtimeSurgingSection = useMemo(
    () => buildRealtimeSurgingSection(shouldShowRealtimeSurging, realtimeSurgingData),
    [realtimeSurgingData, shouldShowRealtimeSurging],
  );
  const newChartEntriesSection = useMemo(
    () => buildNewChartEntriesSection(shouldShowRealtimeSurging, newChartEntriesData),
    [newChartEntriesData, shouldShowRealtimeSurging],
  );
  const realtimeSurgingEmptyMessage =
    shouldShowRealtimeSurging &&
    !isChartLoading &&
    !isRealtimeSurgingLoading &&
    !isRealtimeSurgingError
      ? `아직 +${realtimeSurgingData?.rankChangeThreshold ?? 5} 이상 급상승한 영상이 없습니다.`
      : undefined;
  const newChartEntriesEmptyMessage =
    shouldShowRealtimeSurging &&
    !isChartLoading &&
    !isNewChartEntriesLoading &&
    !isNewChartEntriesError
      ? '이번 집계에서 새로 차트에 진입한 영상이 없습니다.'
      : undefined;
  const hasResolvedChartTrendSignals =
    isApiConfigured &&
    shouldShowSelectedCategoryTrendSignals &&
    !isTrendSignalsLoading &&
    !isTrendSignalsError;
  const hasResolvedFavoriteTrendSignals =
    isApiConfigured &&
    shouldShowAllCategoryTrendSignals &&
    !isFavoriteTrendSignalsLoading &&
    !isFavoriteTrendSignalsError;
  const buyableVideoIdSet = useMemo(
    () => new Set(gameMarket.filter((marketVideo) => marketVideo.canBuy).map((marketVideo) => marketVideo.videoId)),
    [gameMarket],
  );
  const isBuyableOnlyFilterAvailable =
    isApiConfigured &&
    isAuthenticated &&
    canShowGameActions &&
    Boolean(currentGameSeason) &&
    !isGameMarketLoading;
  const filteredSelectedPlaybackSection = useMemo(
    () =>
      isBuyableOnlyFilterActive
        ? filterVideoSection(selectedPlaybackSection, (item) => buyableVideoIdSet.has(item.id))
        : selectedPlaybackSection,
    [buyableVideoIdSet, isBuyableOnlyFilterActive, selectedPlaybackSection],
  );
  const filteredRealtimeSurgingSection = useMemo(
    () =>
      isBuyableOnlyFilterActive
        ? filterVideoSection(realtimeSurgingSection, (item) => buyableVideoIdSet.has(item.id))
        : realtimeSurgingSection,
    [buyableVideoIdSet, isBuyableOnlyFilterActive, realtimeSurgingSection],
  );
  const filteredNewChartEntriesSection = useMemo(
    () =>
      isBuyableOnlyFilterActive
        ? filterVideoSection(newChartEntriesSection, (item) => buyableVideoIdSet.has(item.id))
        : newChartEntriesSection,
    [buyableVideoIdSet, isBuyableOnlyFilterActive, newChartEntriesSection],
  );
  const featuredChartSections = useMemo(
    (): FeaturedVideoSection[] => {
      const sections: FeaturedVideoSection[] = [];

      if (filteredRealtimeSurgingSection) {
        sections.push({
          section: filteredRealtimeSurgingSection,
          eyebrow: 'Realtime Movers',
          emptyMessage: realtimeSurgingEmptyMessage,
          getRankLabel: (item) =>
            getSectionRankLabel(item, realtimeSurgingSignalsByVideoId, '실시간 급상승'),
        });
      }

      if (filteredNewChartEntriesSection) {
        sections.push({
          section: filteredNewChartEntriesSection,
          eyebrow: 'Fresh Entries',
          emptyMessage: newChartEntriesEmptyMessage,
          getRankLabel: (item) =>
            getSectionRankLabel(item, newChartEntriesSignalsByVideoId, '신규 진입'),
        });
      }

      return sections;
    },
    [
      filteredNewChartEntriesSection,
      filteredRealtimeSurgingSection,
      newChartEntriesEmptyMessage,
      newChartEntriesSignalsByVideoId,
      realtimeSurgingEmptyMessage,
      realtimeSurgingSignalsByVideoId,
    ],
  );
  const shouldAutoPrefetchBuyableVideos = shouldPrefetchBuyableVideos({
    hasNextPage,
    isBuyableOnlyFilterActive,
    isBuyableOnlyFilterAvailable,
    isFetchingNextPage,
    loadedItemCount: loadedSelectedVideoCount,
  });
  const buyableVideoSearchStatus =
    isBuyableOnlyFilterActive && isFetchingNextPage
      ? `매수 가능 영상을 찾는 중 · ${Math.min(
          loadedSelectedVideoCount,
          BUYABLE_ONLY_PREFETCH_LIMIT,
        )}/${BUYABLE_ONLY_PREFETCH_LIMIT}개 확인`
      : undefined;
  const isBuyableVideoSearchLoading =
    isBuyableOnlyFilterActive && isFetchingNextPage && !isChartLoading && !isChartError;

  return {
    buyableVideoSearchStatus,
    chartTrendSignalsByVideoId,
    favoriteTrendSignalsByVideoId,
    featuredChartSections,
    filteredSelectedPlaybackSection,
    hasResolvedChartTrendSignals,
    hasResolvedFavoriteTrendSignals,
    isBuyableOnlyFilterAvailable,
    isBuyableVideoSearchLoading,
    isNewChartEntriesError,
    isNewChartEntriesLoading,
    isRealtimeSurgingError,
    isRealtimeSurgingLoading,
    newChartEntriesSection,
    realtimeSurgingSection,
    shouldAutoPrefetchBuyableVideos,
  };
}
