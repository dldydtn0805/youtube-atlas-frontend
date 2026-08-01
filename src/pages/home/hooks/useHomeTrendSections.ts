import { useMemo } from "react";
import type { FeaturedVideoSection } from "../../../components/VideoList/VideoList";
import {
  ALL_VIDEO_CATEGORY_ID,
  supportsVideoTrendSignals,
} from "../../../constants/videoCategories";
import type {
  GameCurrentSeason,
  GameMarketVideo,
} from "../../../features/game/types";
import {
  useNewChartEntries,
  useRealtimeSurging,
  useTopRankRisers,
  useVideoTrendSignals,
} from "../../../features/trending/queries";
import type { VideoTrendSignal } from "../../../features/trending/types";
import type {
  YouTubeCategorySection,
  YouTubeVideoItem,
} from "../../../features/youtube/types";
import {
  buildTopRankRisersSection,
  BUYABLE_ONLY_PREFETCH_LIMIT,
  buildNewChartEntriesSection,
  buildRealtimeSurgingSection,
  filterVideoSection,
  isBuyableVideoSearchActive,
  shouldPrefetchBuyableVideos,
  shouldRenderRealtimeSurgingSection,
} from "../utils";

interface UseHomeTrendSectionsOptions {
  canShowGameActions: boolean;
  currentGameSeason?: GameCurrentSeason;
  likedVideoSection?: YouTubeCategorySection;
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
  shouldLoadLikedVideos: boolean;
}

interface UseHomeTrendSectionsResult {
  buyableVideoSearchStatus?: string;
  chartTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  likedVideoTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  featuredChartSections: FeaturedVideoSection[];
  filteredSelectedPlaybackSection?: YouTubeCategorySection;
  hasResolvedChartTrendSignals: boolean;
  hasResolvedLikedVideoTrendSignals: boolean;
  isBuyableOnlyFilterAvailable: boolean;
  isBuyableVideoSearchLoading: boolean;
  isNewChartEntriesError: boolean;
  isNewChartEntriesLoading: boolean;
  isRealtimeSurgingError: boolean;
  isRealtimeSurgingLoading: boolean;
  newChartEntriesSection?: YouTubeCategorySection;
  topRankRisersSignals: VideoTrendSignal[];
  topRankRisersSection?: YouTubeCategorySection;
  realtimeSurgingSection?: YouTubeCategorySection;
  shouldAutoPrefetchBuyableVideos: boolean;
}

function mapSignalsByVideoId(signals?: VideoTrendSignal[]) {
  return Object.fromEntries(
    (signals ?? []).map((signal) => [signal.videoId, signal]),
  );
}

export function mapInlineTrendSignalsByVideoId(
  section: YouTubeCategorySection | undefined,
  regionCode: string,
  categoryId: string | undefined,
) {
  if (!section) {
    return {};
  }

  return Object.fromEntries(
    section.items.flatMap((item) => {
      if (typeof item.trend?.currentRank !== "number") {
        return [];
      }

      const viewCount =
        typeof item.trend.currentViewCount === "number"
          ? item.trend.currentViewCount
          : Number(item.statistics?.viewCount);

      return [
        [
          item.id,
          {
            categoryId: categoryId ?? section.categoryId,
            categoryLabel: item.trend.categoryLabel ?? section.label,
            capturedAt: item.trend.capturedAt ?? "",
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle,
            currentRank: item.trend.currentRank,
            currentViewCount: Number.isFinite(viewCount) ? viewCount : null,
            isNew: item.trend.isNew ?? false,
            previousRank: item.trend.previousRank ?? null,
            previousViewCount: item.trend.previousViewCount ?? null,
            rankChange: item.trend.rankChange ?? null,
            regionCode,
            thumbnailUrl: item.snippet.thumbnails.medium.url,
            title: item.snippet.title,
            videoId: item.id,
            viewCountDelta: item.trend.viewCountDelta ?? null,
          } satisfies VideoTrendSignal,
        ],
      ];
    }),
  );
}

export function buildChartTrendSignalsByVideoId(
  shouldShowSelectedCategoryTrendSignals: boolean,
  inlineTrendSignalsByVideoId: Record<string, VideoTrendSignal>,
  trendSignalsByVideoId: Record<string, VideoTrendSignal>,
) {
  return shouldShowSelectedCategoryTrendSignals
    ? {
        ...trendSignalsByVideoId,
        ...inlineTrendSignalsByVideoId,
      }
    : {};
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
  likedVideoSection,
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
  shouldLoadLikedVideos,
}: UseHomeTrendSectionsOptions): UseHomeTrendSectionsResult {
  const selectedSectionVideoIds = useMemo(
    () => selectedPlaybackSection?.items.map((item) => item.id) ?? [],
    [selectedPlaybackSection],
  );
  const likedVideoIds = useMemo(
    () => likedVideoSection?.items.map((item) => item.id) ?? [],
    [likedVideoSection],
  );
  const inlineLikedVideoTrendSignalsByVideoId = useMemo(
    () =>
      mapInlineTrendSignalsByVideoId(
        likedVideoSection,
        selectedRegionCode,
        ALL_VIDEO_CATEGORY_ID,
      ),
    [likedVideoSection, selectedRegionCode],
  );
  const likedVideoTrendSignalMissingVideoIds = useMemo(
    () =>
      likedVideoIds.filter(
        (videoId) => !inlineLikedVideoTrendSignalsByVideoId[videoId],
      ),
    [inlineLikedVideoTrendSignalsByVideoId, likedVideoIds],
  );
  const inlineTrendSignalsByVideoId = useMemo(
    () =>
      mapInlineTrendSignalsByVideoId(
        selectedPlaybackSection,
        selectedRegionCode,
        selectedCategoryId,
      ),
    [selectedCategoryId, selectedPlaybackSection, selectedRegionCode],
  );
  const selectedTrendSignalMissingVideoIds = useMemo(
    () =>
      selectedSectionVideoIds.filter(
        (videoId) => !inlineTrendSignalsByVideoId[videoId],
      ),
    [inlineTrendSignalsByVideoId, selectedSectionVideoIds],
  );
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
    isFetching: isTrendSignalsFetching,
    isError: isTrendSignalsError,
  } = useVideoTrendSignals(
    selectedRegionCode,
    selectedCategoryId,
    selectedTrendSignalMissingVideoIds,
    isApiConfigured &&
      shouldShowSelectedCategoryTrendSignals &&
      selectedTrendSignalMissingVideoIds.length > 0,
  );
  const {
    data: fetchedLikedVideoTrendSignalsByVideoId = {},
    isLoading: isLikedVideoTrendSignalsLoading,
    isFetching: isLikedVideoTrendSignalsFetching,
    isError: isLikedVideoTrendSignalsError,
  } = useVideoTrendSignals(
    selectedRegionCode,
    ALL_VIDEO_CATEGORY_ID,
    likedVideoTrendSignalMissingVideoIds,
    shouldLoadLikedVideos &&
      shouldShowAllCategoryTrendSignals &&
      likedVideoTrendSignalMissingVideoIds.length > 0,
  );
  const likedVideoTrendSignalsByVideoId = useMemo(
    () => ({
      ...fetchedLikedVideoTrendSignalsByVideoId,
      ...inlineLikedVideoTrendSignalsByVideoId,
    }),
    [
      fetchedLikedVideoTrendSignalsByVideoId,
      inlineLikedVideoTrendSignalsByVideoId,
    ],
  );
  const {
    data: realtimeSurgingData,
    isLoading: isRealtimeSurgingLoading,
    isError: isRealtimeSurgingError,
  } = useRealtimeSurging(
    selectedRegionCode,
    isApiConfigured && shouldShowRealtimeSurging,
  );
  const { data: topRankRisersData } = useTopRankRisers(
    selectedRegionCode,
    isApiConfigured && shouldShowRealtimeSurging,
  );
  const {
    data: newChartEntriesData,
    isLoading: isNewChartEntriesLoading,
    isError: isNewChartEntriesError,
  } = useNewChartEntries(
    selectedRegionCode,
    isApiConfigured && shouldShowRealtimeSurging,
  );

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
      buildChartTrendSignalsByVideoId(
        shouldShowSelectedCategoryTrendSignals,
        inlineTrendSignalsByVideoId,
        trendSignalsByVideoId,
      ),
    [
      inlineTrendSignalsByVideoId,
      shouldShowSelectedCategoryTrendSignals,
      trendSignalsByVideoId,
    ],
  );
  const realtimeSurgingSection = useMemo(
    () =>
      buildRealtimeSurgingSection(
        shouldShowRealtimeSurging,
        realtimeSurgingData,
      ),
    [realtimeSurgingData, shouldShowRealtimeSurging],
  );
  const newChartEntriesSection = useMemo(
    () =>
      buildNewChartEntriesSection(
        shouldShowRealtimeSurging,
        newChartEntriesData,
      ),
    [newChartEntriesData, shouldShowRealtimeSurging],
  );
  const topRankRisersSection = useMemo(
    () =>
      buildTopRankRisersSection(shouldShowRealtimeSurging, topRankRisersData),
    [shouldShowRealtimeSurging, topRankRisersData],
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
      ? "이번 집계에서 새로 차트에 진입한 영상이 없습니다."
      : undefined;
  const hasResolvedChartTrendSignals =
    isApiConfigured &&
    shouldShowSelectedCategoryTrendSignals &&
    (selectedTrendSignalMissingVideoIds.length === 0 ||
      (!isTrendSignalsLoading && !isTrendSignalsFetching)) &&
    !isTrendSignalsError;
  const hasResolvedLikedVideoTrendSignals =
    isApiConfigured &&
    shouldShowAllCategoryTrendSignals &&
    (likedVideoTrendSignalMissingVideoIds.length === 0 ||
      (!isLikedVideoTrendSignalsLoading &&
        !isLikedVideoTrendSignalsFetching)) &&
    !isLikedVideoTrendSignalsError;
  const buyableVideoIdSet = useMemo(
    () =>
      new Set(
        gameMarket
          .filter((marketVideo) => marketVideo.canBuy)
          .map((marketVideo) => marketVideo.videoId),
      ),
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
        ? filterVideoSection(selectedPlaybackSection, (item) =>
            buyableVideoIdSet.has(item.id),
          )
        : selectedPlaybackSection,
    [buyableVideoIdSet, isBuyableOnlyFilterActive, selectedPlaybackSection],
  );
  const filteredRealtimeSurgingSection = useMemo(
    () =>
      isBuyableOnlyFilterActive
        ? filterVideoSection(realtimeSurgingSection, (item) =>
            buyableVideoIdSet.has(item.id),
          )
        : realtimeSurgingSection,
    [buyableVideoIdSet, isBuyableOnlyFilterActive, realtimeSurgingSection],
  );
  const filteredNewChartEntriesSection = useMemo(
    () =>
      isBuyableOnlyFilterActive
        ? filterVideoSection(newChartEntriesSection, (item) =>
            buyableVideoIdSet.has(item.id),
          )
        : newChartEntriesSection,
    [buyableVideoIdSet, isBuyableOnlyFilterActive, newChartEntriesSection],
  );
  const featuredChartSections = useMemo((): FeaturedVideoSection[] => {
    const sections: FeaturedVideoSection[] = [];

    if (filteredRealtimeSurgingSection) {
      sections.push({
        section: filteredRealtimeSurgingSection,
        eyebrow: "Realtime Movers",
        emptyMessage: realtimeSurgingEmptyMessage,
        getRankLabel: (item) =>
          getSectionRankLabel(
            item,
            realtimeSurgingSignalsByVideoId,
            "실시간 급상승",
          ),
      });
    }

    if (filteredNewChartEntriesSection) {
      sections.push({
        section: filteredNewChartEntriesSection,
        eyebrow: "Fresh Entries",
        emptyMessage: newChartEntriesEmptyMessage,
        getRankLabel: (item) =>
          getSectionRankLabel(
            item,
            newChartEntriesSignalsByVideoId,
            "신규 진입",
          ),
      });
    }

    return sections;
  }, [
    filteredNewChartEntriesSection,
    filteredRealtimeSurgingSection,
    newChartEntriesEmptyMessage,
    newChartEntriesSignalsByVideoId,
    realtimeSurgingEmptyMessage,
    realtimeSurgingSignalsByVideoId,
  ]);
  const shouldAutoPrefetchBuyableVideos = shouldPrefetchBuyableVideos({
    hasNextPage,
    isBuyableOnlyFilterActive,
    isBuyableOnlyFilterAvailable,
    isFetchingNextPage,
    loadedItemCount: loadedSelectedVideoCount,
  });
  const isBuyableVideoSearchActiveState = isBuyableVideoSearchActive({
    hasNextPage,
    isBuyableOnlyFilterActive,
    isBuyableOnlyFilterAvailable,
    isFetchingNextPage,
    loadedItemCount: loadedSelectedVideoCount,
  });
  const buyableVideoSearchStatus = isBuyableVideoSearchActiveState
    ? `매수 가능 영상을 찾는 중 · ${Math.min(
        loadedSelectedVideoCount,
        BUYABLE_ONLY_PREFETCH_LIMIT,
      )}/${BUYABLE_ONLY_PREFETCH_LIMIT}개 확인`
    : undefined;
  const isBuyableVideoSearchLoading =
    isBuyableVideoSearchActiveState && !isChartLoading && !isChartError;

  return {
    buyableVideoSearchStatus,
    chartTrendSignalsByVideoId,
    likedVideoTrendSignalsByVideoId,
    featuredChartSections,
    filteredSelectedPlaybackSection,
    hasResolvedChartTrendSignals,
    hasResolvedLikedVideoTrendSignals,
    isBuyableOnlyFilterAvailable,
    isBuyableVideoSearchLoading,
    isNewChartEntriesError,
    isNewChartEntriesLoading,
    isRealtimeSurgingError,
    isRealtimeSurgingLoading,
    newChartEntriesSection,
    topRankRisersSignals: topRankRisersData?.items ?? [],
    topRankRisersSection,
    realtimeSurgingSection,
    shouldAutoPrefetchBuyableVideos,
  };
}
