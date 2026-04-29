import { useMemo } from 'react';
import countryCodes from '../../../constants/countryCodes';
import {
  ALL_VIDEO_CATEGORY_ID,
  supportsVideoGameActions,
  supportsVideoTrendSignals,
  type VideoCategory,
} from '../../../constants/videoCategories';
import type { AuthStatus } from '../../../features/auth/types';
import type { GameCurrentSeason, GameMarketVideo, GamePosition } from '../../../features/game/types';
import type { VideoTrendSignal } from '../../../features/trending/types';
import type { YouTubeCategorySection, YouTubeVideoItem } from '../../../features/youtube/types';
import type { ChartSortMode } from '../types';
import {
  FAVORITE_STREAMER_VIDEO_SECTION,
  GAME_PORTFOLIO_QUEUE_ID,
  HISTORY_PLAYBACK_QUEUE_ID,
  filterVideoSection,
  mapGamePositionToVideoItem,
  mergeSections,
  mergeUniqueVideoItems,
  relabelVideoSection,
  shouldPrefetchBuyableVideos,
  sortVideoSection,
} from '../utils';
import useHomeTrendSections from './useHomeTrendSections';

interface UseHomeChartCollectionsOptions {
  authStatus: AuthStatus;
  buyableMarketChartPages?: YouTubeCategorySection[];
  chartSortMode: ChartSortMode;
  currentGameSeason?: GameCurrentSeason;
  favoriteStreamerVideosError: unknown;
  favoriteStreamerVideosPages?: YouTubeCategorySection[];
  favoriteStreamersCount: number;
  gameHistoryPositions: GamePosition[];
  gameMarket: GameMarketVideo[];
  hasNextMusicChartPage: boolean;
  hasNextPage: boolean;
  historyPlaybackVideo: YouTubeVideoItem | null;
  isApiConfigured: boolean;
  isBuyableMarketChartLoading: boolean;
  isBuyableOnlyFilterActive: boolean;
  isChartError: boolean;
  isChartLoading: boolean;
  isFetchingNextMusicChartPage: boolean;
  isFetchingNextPage: boolean;
  isGameMarketLoading: boolean;
  isVideoCategoriesError: boolean;
  isVideoCategoriesLoading: boolean;
  musicChartPages?: YouTubeCategorySection[];
  openGamePositions: GamePosition[];
  selectedCategory?: VideoCategory;
  selectedRegionCode: string;
  selectedSectionPages?: YouTubeCategorySection[];
  shouldLoadFavorites: boolean;
}

function mapMusicTrendSignalsByVideoId(
  section: YouTubeCategorySection | undefined,
  regionCode: string,
): Record<string, VideoTrendSignal> {
  if (!section) {
    return {};
  }

  return Object.fromEntries(
    section.items.flatMap((item) => {
      if (!item.trend || typeof item.trend.currentRank !== 'number') {
        return [];
      }

      return [[
        item.id,
        {
          categoryId: section.categoryId,
          categoryLabel: section.label,
          capturedAt: item.trend.capturedAt ?? '',
          channelTitle: item.snippet.channelTitle,
          currentRank: item.trend.currentRank,
          currentViewCount: item.trend.currentViewCount ?? null,
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
      ]];
    }),
  );
}

export default function useHomeChartCollections({
  authStatus,
  buyableMarketChartPages,
  chartSortMode,
  currentGameSeason,
  favoriteStreamerVideosError,
  favoriteStreamerVideosPages,
  favoriteStreamersCount,
  gameHistoryPositions,
  gameMarket,
  hasNextMusicChartPage,
  hasNextPage,
  historyPlaybackVideo,
  isApiConfigured,
  isBuyableMarketChartLoading,
  isBuyableOnlyFilterActive,
  isChartError,
  isChartLoading,
  isFetchingNextMusicChartPage,
  isFetchingNextPage,
  isGameMarketLoading,
  isVideoCategoriesError,
  isVideoCategoriesLoading,
  musicChartPages,
  openGamePositions,
  selectedCategory,
  selectedRegionCode,
  selectedSectionPages,
  shouldLoadFavorites,
}: UseHomeChartCollectionsOptions) {
  const gameMarketSignalsByVideoId = useMemo(
    () =>
      Object.fromEntries(
        gameMarket.map((marketVideo) => [
          marketVideo.videoId,
          {
            categoryId: ALL_VIDEO_CATEGORY_ID,
            categoryLabel: '전체',
            capturedAt: marketVideo.capturedAt,
            channelTitle: marketVideo.channelTitle,
            currentRank: marketVideo.currentRank,
            currentViewCount: marketVideo.currentViewCount,
            isNew: marketVideo.isNew,
            previousRank: marketVideo.previousRank,
            previousViewCount: null,
            rankChange: marketVideo.rankChange,
            regionCode: currentGameSeason?.regionCode ?? selectedRegionCode,
            thumbnailUrl: marketVideo.thumbnailUrl,
            title: marketVideo.title,
            videoId: marketVideo.videoId,
            viewCountDelta: marketVideo.viewCountDelta,
          } satisfies VideoTrendSignal,
        ]),
      ),
    [currentGameSeason?.regionCode, gameMarket, selectedRegionCode],
  );

  const selectedSection = useMemo(() => mergeSections(selectedSectionPages), [selectedSectionPages]);
  const shouldShowMusicChart =
    selectedCategory?.id === ALL_VIDEO_CATEGORY_ID &&
    supportsVideoTrendSignals(ALL_VIDEO_CATEGORY_ID, selectedRegionCode);
  const musicChartSection = useMemo(
    () => (shouldShowMusicChart ? mergeSections(musicChartPages) : undefined),
    [musicChartPages, shouldShowMusicChart],
  );
  const buyableMarketChartSection = useMemo(
    () =>
      mergeSections(buyableMarketChartPages) ?? {
        categoryId: 'buyable-market',
        description: '현재 지갑과 보유 상태 기준으로 바로 매수 가능한 영상만 모았습니다.',
        items: [],
        label: '매수 가능',
      },
    [buyableMarketChartPages],
  );
  const musicPlaybackSection = useMemo(
    () => (musicChartSection ? { ...musicChartSection, categoryId: 'chart:music' } : undefined),
    [musicChartSection],
  );
  const buyableVideoIdSet = useMemo(
    () => new Set(gameMarket.filter((marketVideo) => marketVideo.canBuy).map((marketVideo) => marketVideo.videoId)),
    [gameMarket],
  );
  const marketPriceByVideoId = useMemo(
    () => Object.fromEntries(gameMarket.map((marketVideo) => [marketVideo.videoId, marketVideo.currentPricePoints])),
    [gameMarket],
  );
  const filteredMusicChartSection = useMemo(
    () =>
      isBuyableOnlyFilterActive
        ? filterVideoSection(musicPlaybackSection, (item) => buyableVideoIdSet.has(item.id))
        : musicPlaybackSection,
    [buyableVideoIdSet, isBuyableOnlyFilterActive, musicPlaybackSection],
  );
  const sortedFilteredMusicChartSection = useMemo(
    () => sortVideoSection(filteredMusicChartSection, chartSortMode),
    [chartSortMode, filteredMusicChartSection],
  );
  const sortedBuyableMarketChartSection = useMemo(
    () => sortVideoSection(buyableMarketChartSection, chartSortMode),
    [buyableMarketChartSection, chartSortMode],
  );
  const musicTrendSignalsByVideoId = useMemo(
    () => mapMusicTrendSignalsByVideoId(musicPlaybackSection, selectedRegionCode),
    [musicPlaybackSection, selectedRegionCode],
  );
  const selectedPlaybackSection = useMemo(
    () =>
      selectedSection
        ? {
            ...selectedSection,
            categoryId: `category:${selectedCategory?.id ?? selectedSection.categoryId}`,
          }
        : undefined,
    [selectedCategory?.id, selectedSection],
  );
  const selectedCountryName =
    countryCodes.find((country) => country.code === selectedRegionCode)?.name ?? selectedRegionCode;
  const isAllCategorySelected = selectedCategory?.id === ALL_VIDEO_CATEGORY_ID;
  const isTrendRegionSelected = supportsVideoTrendSignals(ALL_VIDEO_CATEGORY_ID, selectedRegionCode);
  const canShowGameActions = supportsVideoGameActions(selectedCategory?.id, selectedRegionCode);
  const loadedSelectedVideoCount = selectedSection?.items.length ?? 0;

  const favoriteStreamerVideoSection =
    favoriteStreamersCount > 0 && isAllCategorySelected
      ? mergeSections(favoriteStreamerVideosPages) ?? FAVORITE_STREAMER_VIDEO_SECTION
      : undefined;
  const favoriteChartSection =
    authStatus === 'authenticated' && isAllCategorySelected
      ? favoriteStreamerVideoSection ?? FAVORITE_STREAMER_VIDEO_SECTION
      : undefined;
  const buyableFavoriteChartSection = useMemo(() => {
    if (!favoriteChartSection) {
      return undefined;
    }

    if (!isBuyableOnlyFilterActive) {
      return favoriteChartSection;
    }

    return filterVideoSection(favoriteChartSection, (item) => buyableVideoIdSet.has(item.id));
  }, [buyableVideoIdSet, favoriteChartSection, isBuyableOnlyFilterActive]);
  const gamePortfolioSection = useMemo(
    () => ({
      categoryId: GAME_PORTFOLIO_QUEUE_ID,
      description: '매수한 영상은 여기서 바로 다시 열고 정리할 수 있습니다.',
      items: [...openGamePositions]
        .sort((left, right) => new Date(right.buyCapturedAt).getTime() - new Date(left.buyCapturedAt).getTime())
        .map(mapGamePositionToVideoItem),
      label: '내 보유 포지션',
    }),
    [openGamePositions],
  );
  const historyPlaybackSection = useMemo(() => {
    const historyPlaybackItems = mergeUniqueVideoItems(
      historyPlaybackVideo ? [historyPlaybackVideo] : undefined,
      gameHistoryPositions.map(mapGamePositionToVideoItem),
    );

    if (historyPlaybackItems.length === 0) {
      return undefined;
    }

    return {
      categoryId: HISTORY_PLAYBACK_QUEUE_ID,
      description: '거래내역에서 다시 연 영상을 순서대로 이어서 볼 수 있습니다.',
      items: historyPlaybackItems,
      label: '거래내역 다시 보기',
    };
  }, [gameHistoryPositions, historyPlaybackVideo]);

  const {
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
    topRankRisersSignals,
    topRankRisersSection,
    realtimeSurgingSection,
    shouldAutoPrefetchBuyableVideos,
  } = useHomeTrendSections({
    canShowGameActions,
    currentGameSeason,
    favoriteStreamerVideoSection,
    gameMarket,
    hasNextPage,
    isAllCategorySelected,
    isApiConfigured,
    isAuthenticated: authStatus === 'authenticated',
    isBuyableOnlyFilterActive,
    isChartError,
    isChartLoading,
    isFetchingNextPage,
    isGameMarketLoading,
    loadedSelectedVideoCount,
    selectedCategoryId: selectedCategory?.id,
    selectedPlaybackSection,
    selectedRegionCode,
    shouldLoadFavorites,
  });

  const extraPlaybackSections = useMemo(
    () =>
      [topRankRisersSection, sortedBuyableMarketChartSection, sortedFilteredMusicChartSection].filter(
        (section): section is NonNullable<typeof section> => Boolean(section),
      ),
    [sortedBuyableMarketChartSection, sortedFilteredMusicChartSection, topRankRisersSection],
  );
  const selectedVideoRankSignalsById = useMemo(
    () => ({
      ...chartTrendSignalsByVideoId,
      ...musicTrendSignalsByVideoId,
    }),
    [chartTrendSignalsByVideoId, musicTrendSignalsByVideoId],
  );
  const shouldShowTop200Label = isAllCategorySelected && isTrendRegionSelected;
  const loadedMusicVideoCount = musicPlaybackSection?.items.length ?? 0;
  const shouldAutoPrefetchBuyableMusicVideos = shouldPrefetchBuyableVideos({
    hasNextPage: hasNextMusicChartPage,
    isBuyableOnlyFilterActive,
    isBuyableOnlyFilterAvailable,
    isFetchingNextPage: isFetchingNextMusicChartPage,
    loadedItemCount: loadedMusicVideoCount,
  });
  const displaySelectedPlaybackSection = useMemo(() => {
    const labeledSection = shouldShowTop200Label
      ? relabelVideoSection(filteredSelectedPlaybackSection, 'TOP 200')
      : filteredSelectedPlaybackSection;

    return sortVideoSection(labeledSection, chartSortMode);
  }, [chartSortMode, filteredSelectedPlaybackSection, shouldShowTop200Label]);
  const sortedBuyableFavoriteChartSection = useMemo(
    () => sortVideoSection(buyableFavoriteChartSection, chartSortMode),
    [buyableFavoriteChartSection, chartSortMode],
  );
  const sortedRealtimeSurgingSection = useMemo(
    () => sortVideoSection(realtimeSurgingSection, chartSortMode),
    [chartSortMode, realtimeSurgingSection],
  );
  const sortedNewChartEntriesSection = useMemo(
    () => sortVideoSection(newChartEntriesSection, chartSortMode),
    [chartSortMode, newChartEntriesSection],
  );
  const sortedFeaturedChartSections = useMemo(
    () =>
      featuredChartSections.map((featuredSection) => {
        const sortedSection =
          featuredSection.section.categoryId === sortedRealtimeSurgingSection?.categoryId
            ? sortedRealtimeSurgingSection
            : featuredSection.section.categoryId === sortedNewChartEntriesSection?.categoryId
              ? sortedNewChartEntriesSection
              : sortVideoSection(featuredSection.section, chartSortMode);

        return {
          ...featuredSection,
          section: sortedSection ?? featuredSection.section,
        };
      }),
    [
      chartSortMode,
      featuredChartSections,
      sortedNewChartEntriesSection,
      sortedRealtimeSurgingSection,
    ],
  );
  const labeledSelectedPlaybackSection = useMemo(
    () =>
      shouldShowTop200Label
        ? relabelVideoSection(selectedPlaybackSection, 'TOP 200')
        : selectedPlaybackSection,
    [selectedPlaybackSection, shouldShowTop200Label],
  );
  const favoriteStreamerVideoErrorMessage =
    favoriteStreamerVideosError instanceof Error
      ? favoriteStreamerVideosError.message
      : '즐겨찾기 영상을 불러오지 못했습니다.';
  const openDistinctVideoCount = new Set(openGamePositions.map((position) => position.videoId)).size;
  const isOpenPositionLimitReached =
    currentGameSeason != null && openDistinctVideoCount >= currentGameSeason.maxOpenPositions;
  const buyableChartEmptyMessage = useMemo(() => {
    if (currentGameSeason && openDistinctVideoCount >= currentGameSeason.maxOpenPositions) {
      return '보유 가능한 종목 슬롯을 모두 사용 중입니다. 기존 포지션을 정리하면 다시 매수 가능한 영상이 표시됩니다.';
    }

    if (
      gameMarket.length > 0 &&
      gameMarket.every((marketVideo) => marketVideo.buyBlockedReason === '현재 가격 기준 보유 포인트가 부족합니다.')
    ) {
      return '현재 잔액으로는 즉시 매수 가능한 영상이 없습니다.';
    }

    return '지금 바로 매수 가능한 영상이 없습니다.';
  }, [currentGameSeason, gameMarket, openDistinctVideoCount]);

  return {
    buyableChartEmptyMessage,
    buyableMarketChartSection,
    buyableVideoSearchStatus,
    canShowGameActions,
    displaySelectedPlaybackSection,
    extraPlaybackSections,
    favoriteStreamerVideoErrorMessage,
    favoriteStreamerVideoSection,
    favoriteTrendSignalsByVideoId,
    gameMarketSignalsByVideoId,
    gamePortfolioSection,
    hasResolvedChartTrendSignals,
    hasResolvedFavoriteTrendSignals,
    historyPlaybackSection,
    isAllCategorySelected,
    isOpenPositionLimitReached,
    isTrendRegionSelected,
    labeledSelectedPlaybackSection,
    marketPriceByVideoId,
    musicChartSection: sortedFilteredMusicChartSection,
    musicTrendSignalsByVideoId,
    openDistinctVideoCount,
    realtimeSurgingSection: sortedRealtimeSurgingSection,
    selectedCountryName,
    selectedPlaybackSection,
    selectedVideoRankSignalsById,
    shouldAutoPrefetchBuyableMusicVideos,
    shouldAutoPrefetchBuyableVideos,
    sortedBuyableFavoriteChartSection,
    sortedBuyableMarketChartSection,
    sortedFeaturedChartSections,
    sortedNewChartEntriesSection,
    topRankRisersSignals,
    topRankRisersSection,
    chartTrendSignalsByVideoId,
    isBuyableOnlyFilterAvailable,
    isBuyableVideoSearchLoading,
    isBuyableMarketChartLoading,
    isChartLoading: isVideoCategoriesLoading || (!selectedCategory && !isVideoCategoriesError) || isChartLoading,
    isNewChartEntriesError,
    isNewChartEntriesLoading,
    isRealtimeSurgingError,
    isRealtimeSurgingLoading,
    hasNextMusicChartPage,
  };
}
