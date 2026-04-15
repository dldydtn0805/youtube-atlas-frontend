import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import type { VideoPlayerHandle } from '../../components/VideoPlayer/VideoPlayer';
import AppHeader from './sections/AppHeader';
import { GameSelectedVideoPriceSummary, SelectedVideoGameActionsBundle } from './sections/GameActionContent';
import GameCoinModal from './sections/GameDividendModal';
import { ChartViewModal, RegionFilterModal } from './sections/FilterPanels';
import GamePanelSection from './sections/GamePanelSection';
import GameRankHistoryModal from './sections/GameRankHistoryModal';
import GameTradeModal from './sections/GameTradeModal';
import HomePlaybackSection from './sections/HomePlaybackSection';
import StickySelectedVideoControls from './sections/StickySelectedVideoControls';
import {
  buildOpenGameHoldings,
  calculateEstimatedCoinYieldAfterBuy,
  formatGameOrderQuantity,
  formatCoins,
  formatPoints,
  formatRank,
  getPointTone,
  normalizeGameOrderCapacity,
  normalizeGameOrderQuantity,
  SELL_FEE_RATE_LABEL,
  summarizeGamePositions,
} from './gameHelpers';
import useAppPreferences from './hooks/useAppPreferences';
import useHomeChartViewState from './hooks/useHomeChartViewState';
import useHomeGameTradeActions from './hooks/useHomeGameTradeActions';
import useHomeGameUiState from './hooks/useHomeGameUiState';
import useHomePlaybackState from './hooks/useHomePlaybackState';
import useHomeTrendSections from './hooks/useHomeTrendSections';
import useLogoutOnUnauthorized from './hooks/useLogoutOnUnauthorized';
import useSelectedVideoGameState from './hooks/useSelectedVideoGameState';
import {
  DEFAULT_CATEGORY_ID,
  FAVORITE_STREAMER_VIDEO_SECTION,
  GAME_PORTFOLIO_QUEUE_ID,
  HISTORY_PLAYBACK_QUEUE_ID,
  filterVideoSection,
  getFullscreenElement,
  getAdjacentGamePosition,
  getVideoThumbnailUrl,
  isBuyableVideoSearchActive,
  mapGamePositionToVideoItem,
  mergeUniqueVideoItems,
  mergeSections,
  relabelVideoSection,
  resolvePlaybackCategoryLabel,
  shouldPrefetchBuyableVideos,
  sortedCountryCodes,
  type RegionCode,
} from './utils';
import type { ChartViewMode } from './types';
import countryCodes from '../../constants/countryCodes';
import {
  ALL_VIDEO_CATEGORY_ID,
  sortVideoCategories,
  supportsVideoGameActions,
  supportsVideoTrendSignals,
  VIDEO_GAME_REGION_CODE,
} from '../../constants/videoCategories';
import { useAuth } from '../../features/auth/useAuth';
import {
  invalidateGameQueries,
  gameQueryKeys,
  useBuyGamePosition,
  useCurrentGameSeason,
  useGameCoinOverview,
  useGameCoinTierProgress,
  useGameLeaderboard,
  useGameLeaderboardPositions,
  useGameMarket,
  useGamePositionRankHistory,
  useMyGamePositions,
  useSellGamePositions,
} from '../../features/game/queries';
import { useGameRealtimeInvalidation } from '../../features/game/realtime';
import type { GamePosition, GamePositionRankHistory } from '../../features/game/types';
import { fetchGamePositionRankHistory } from '../../features/game/api';
import {
  useFavoriteStreamerVideos,
  useFavoriteStreamers,
  useToggleFavoriteStreamer,
} from '../../features/favorites/queries';
import { useVideoRankHistory } from '../../features/trending/queries';
import type { VideoRankHistory, VideoTrendSignal } from '../../features/trending/types';
import { fetchVideoById } from '../../features/youtube/api';
import { useMusicTopVideos, usePopularVideosByCategory, useVideoCategories } from '../../features/youtube/queries';
import type { YouTubeVideoItem } from '../../features/youtube/types';
import { ApiRequestError, isApiConfigured } from '../../lib/api';
import '../../styles/app.css';

const COLLAPSED_HOME_SECTIONS_STORAGE_KEY = 'youtube-atlas-collapsed-home-sections';
const RANKING_GAME_SECTION_ID = 'ranking-game';

function mergeRankHistories(
  positionHistory?: GamePositionRankHistory,
  videoHistory?: VideoRankHistory,
): GamePositionRankHistory | VideoRankHistory | undefined {
  if (!positionHistory) {
    return videoHistory;
  }

  if (!videoHistory || videoHistory.videoId !== positionHistory.videoId) {
    return positionHistory;
  }

  const latestPositionCapturedAt = positionHistory.points.at(-1)?.capturedAt ?? positionHistory.latestCapturedAt;
  const trailingVideoPoints = videoHistory.points
    .filter((point) => !latestPositionCapturedAt || new Date(point.capturedAt).getTime() > new Date(latestPositionCapturedAt).getTime())
    .map((point) => ({
      ...point,
      buyPoint: false,
      sellPoint: false,
    }));

  if (trailingVideoPoints.length === 0) {
    return positionHistory;
  }

  return {
    ...positionHistory,
    latestCapturedAt: videoHistory.latestCapturedAt,
    latestChartOut: videoHistory.latestChartOut,
    latestRank: videoHistory.latestRank,
    points: [...positionHistory.points, ...trailingVideoPoints],
  };
}

function mapMusicTrendSignalsByVideoId(
  section: {
    categoryId: string;
    items: YouTubeVideoItem[];
    label: string;
  } | undefined,
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
          categoryLabel: item.trend.categoryLabel ?? section.label,
          capturedAt: item.trend.capturedAt ?? '',
          currentRank: item.trend.currentRank,
          currentViewCount: item.trend.currentViewCount ?? null,
          isNew: item.trend.isNew ?? false,
          previousRank: item.trend.previousRank ?? null,
          previousViewCount: item.trend.previousViewCount ?? null,
          rankChange: item.trend.rankChange ?? null,
          regionCode,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          channelId: item.snippet.channelId,
          thumbnailUrl: item.snippet.thumbnails.high.url,
          videoId: item.id,
          viewCountDelta: item.trend.viewCountDelta ?? null,
        } satisfies VideoTrendSignal,
      ]];
    }),
  );
}

function mergeMultiplePositionHistories(
  positionHistories: GamePositionRankHistory[],
  videoHistory?: VideoRankHistory,
): GamePositionRankHistory | VideoRankHistory | undefined {
  if (positionHistories.length === 0) {
    return videoHistory;
  }

  const sortedHistories = [...positionHistories].sort(
    (left, right) => new Date(left.buyCapturedAt).getTime() - new Date(right.buyCapturedAt).getTime(),
  );
  const dedupeMergedPoints = (
    points: GamePositionRankHistory['points'],
  ): GamePositionRankHistory['points'] => {
    const uniquePoints = new Map<string, GamePositionRankHistory['points'][number]>();

    for (const point of points) {
      const key = `${point.runId}:${point.capturedAt}:${point.buyPoint ? 'b' : 'n'}:${point.sellPoint ? 's' : 'n'}`;
      uniquePoints.set(key, point);
    }

    return Array.from(uniquePoints.values()).sort(
      (left, right) => new Date(left.capturedAt).getTime() - new Date(right.capturedAt).getTime(),
    );
  };
  const [firstHistory, ...restHistories] = sortedHistories;
  let mergedHistory = firstHistory;

  for (const nextHistory of restHistories) {
    const latestCapturedAt = mergedHistory.points.at(-1)?.capturedAt ?? mergedHistory.latestCapturedAt;
    const nextBuyCapturedAt = nextHistory.buyCapturedAt;
    const gapVideoPoints =
      videoHistory?.points
        .filter((point) => {
          const capturedAt = new Date(point.capturedAt).getTime();
          const latestCapturedTime = latestCapturedAt ? new Date(latestCapturedAt).getTime() : null;
          const nextBuyCapturedTime = nextBuyCapturedAt ? new Date(nextBuyCapturedAt).getTime() : null;

          return (
            (latestCapturedTime === null || capturedAt > latestCapturedTime) &&
            (nextBuyCapturedTime === null || capturedAt < nextBuyCapturedTime)
          );
        })
        .map((point) => ({
          ...point,
          buyPoint: false,
          sellPoint: false,
        })) ?? [];
    const trailingPoints = nextHistory.points.filter(
      (point) => !latestCapturedAt || new Date(point.capturedAt).getTime() > new Date(latestCapturedAt).getTime(),
    );

    mergedHistory = {
      ...mergedHistory,
      closedAt: nextHistory.closedAt,
      latestCapturedAt: nextHistory.latestCapturedAt,
      latestChartOut: nextHistory.latestChartOut,
      latestRank: nextHistory.latestRank,
      positionId: nextHistory.positionId,
      sellRank: nextHistory.sellRank,
      status: nextHistory.status,
      points: dedupeMergedPoints(
        gapVideoPoints.length > 0 || trailingPoints.length > 0
          ? [...mergedHistory.points, ...gapVideoPoints, ...trailingPoints]
          : mergedHistory.points,
      ),
    };
  }

  return mergeRankHistories(mergedHistory, videoHistory);
}

function getInitialCollapsedHomeSectionIds() {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  const storedValue = window.localStorage.getItem(COLLAPSED_HOME_SECTIONS_STORAGE_KEY);

  if (!storedValue) {
    return [] as string[];
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown;

    return Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [] as string[];
  }
}

function persistCollapsedHomeSectionIds(sectionIds: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(COLLAPSED_HOME_SECTIONS_STORAGE_KEY, JSON.stringify(sectionIds));
}

function getNextCoinRefreshSeconds(remainingSecondsList: Array<number | null | undefined>) {
  return remainingSecondsList.reduce<number | null>((nearest, remainingSeconds) => {
    if (typeof remainingSeconds !== 'number' || !Number.isFinite(remainingSeconds) || remainingSeconds < 0) {
      return nearest;
    }

    return nearest === null ? remainingSeconds : Math.min(nearest, remainingSeconds);
  }, null);
}

function HomePage() {
  const queryClient = useQueryClient();
  const { accessToken, isLoggingOut, logout, status: authStatus, user } = useAuth();
  const [selectedOpenPositionId, setSelectedOpenPositionId] = useState<number | null>(null);
  const [activeGameTab, setActiveGameTab] = useState<'positions' | 'history' | 'leaderboard'>('positions');
  const [isBuyableOnlyFilterActive, setIsBuyableOnlyFilterActive] = useState(false);
  const [collapsedHomeSectionIds, setCollapsedHomeSectionIds] = useState(getInitialCollapsedHomeSectionIds);
  const [selectedLeaderboardUserId, setSelectedLeaderboardUserId] = useState<number | null>(null);
  const [historyPlaybackVideo, setHistoryPlaybackVideo] = useState<YouTubeVideoItem | null>(null);
  const [historyPlaybackLoadingVideoId, setHistoryPlaybackLoadingVideoId] = useState<string | null>(null);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isChartViewModalOpen, setIsChartViewModalOpen] = useState(false);
  const [pendingRegionTopVideoSelection, setPendingRegionTopVideoSelection] = useState<string | null>(null);
  const [isPlaybackPaused, setIsPlaybackPaused] = useState(false);
  const [selectedChartView, setSelectedChartView] = useState<ChartViewMode>('all');
  const [coinCountdownNow, setCoinCountdownNow] = useState(() => Date.now());
  const lastCoinAutoRefreshAtRef = useRef<number | null>(null);
  const playerStageRef = useRef<HTMLDivElement | null>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle | null>(null);
  const playerSectionRef = useRef<HTMLElement | null>(null);
  const playerViewportRef = useRef<HTMLDivElement | null>(null);
  const {
    cinematicToggleLabel,
    handleToggleCinematicMode,
    handleToggleThemeMode,
    isCinematicModeActive,
    isDarkMode,
    isMobileLayout,
    selectedRegionCode,
    themeToggleLabel,
    updateRegionCode,
  } = useAppPreferences({
    playerSectionRef,
    playerStageRef,
  });

  useEffect(() => {
    persistCollapsedHomeSectionIds(collapsedHomeSectionIds);
  }, [collapsedHomeSectionIds]);

  const scrollToPlayerStage = useCallback(() => {
    if (isMobileLayout) {
      return;
    }

    window.setTimeout(() => {
      if (typeof window === 'undefined') {
        return;
      }

      const fullscreenElement = getFullscreenElement();

      if (fullscreenElement instanceof HTMLElement) {
        if (typeof fullscreenElement.scrollTo === 'function') {
          fullscreenElement.scrollTo({
            behavior: 'smooth',
            top: 0,
          });
        } else {
          fullscreenElement.scrollTop = 0;
        }
      }

      window.scrollTo({
        behavior: 'smooth',
        top: 0,
      });
    }, 0);
  }, [isMobileLayout]);

  const {
    data: videoCategories = [],
    isLoading: isVideoCategoriesLoading,
    isError: isVideoCategoriesError,
    error: videoCategoriesError,
  } = useVideoCategories(selectedRegionCode);
  const [selectedCategoryId, setSelectedCategoryId] = useState(DEFAULT_CATEGORY_ID);
  const sortedVideoCategories = sortVideoCategories(videoCategories);
  const selectedCategory =
    sortedVideoCategories.find((category) => category.id === selectedCategoryId) ?? sortedVideoCategories[0];
  const regionOptions = sortedCountryCodes.map((country) => ({
    value: country.code,
    label: `${country.code} · ${country.name}`,
  }));
  const shouldLoadGame = isApiConfigured && authStatus === 'authenticated';
  useGameRealtimeInvalidation(accessToken, selectedRegionCode, shouldLoadGame);

  const {
    data: currentGameSeason,
    error: currentGameSeasonError,
    isLoading: isCurrentGameSeasonLoading,
    dataUpdatedAt: currentGameSeasonUpdatedAt,
  } = useCurrentGameSeason(accessToken, selectedRegionCode, shouldLoadGame);
  const {
    data: gameMarket = [],
    error: gameMarketError,
    isLoading: isGameMarketLoading,
  } = useGameMarket(accessToken, selectedRegionCode, shouldLoadGame);
  const {
    data: gameCoinOverview,
    error: gameCoinOverviewError,
    dataUpdatedAt: gameCoinOverviewUpdatedAt,
  } = useGameCoinOverview(
    accessToken,
    selectedRegionCode,
    shouldLoadGame,
  );
  const {
    data: gameCoinTierProgress,
    error: gameCoinTierProgressError,
  } = useGameCoinTierProgress(accessToken, selectedRegionCode, shouldLoadGame);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return;
    }

    window.__emitGameRealtimeTest = (event) => {
      const regionCode = event?.regionCode ?? selectedRegionCode;
      const seasonId = event?.seasonId ?? currentGameSeason?.seasonId ?? null;

      void invalidateGameQueries(queryClient, {
        accessToken,
        includeLeaderboardPositions: true,
        regionCode,
        seasonId,
      });
    };

    return () => {
      delete window.__emitGameRealtimeTest;
    };
  }, [
    accessToken,
    currentGameSeason?.seasonId,
    queryClient,
    selectedRegionCode,
  ]);
  const gameMarketSignalsByVideoId = useMemo(
    () =>
      Object.fromEntries(
        gameMarket.map((marketVideo) => [
          marketVideo.videoId,
          {
            categoryId: ALL_VIDEO_CATEGORY_ID,
            categoryLabel: '전체',
            capturedAt: marketVideo.capturedAt,
            currentRank: marketVideo.currentRank,
            currentViewCount: marketVideo.currentViewCount,
            isNew: marketVideo.isNew,
            previousRank: marketVideo.previousRank,
            previousViewCount: null,
            rankChange: marketVideo.rankChange,
            regionCode: currentGameSeason?.regionCode ?? selectedRegionCode,
            title: marketVideo.title,
            channelTitle: marketVideo.channelTitle,
            thumbnailUrl: marketVideo.thumbnailUrl,
            videoId: marketVideo.videoId,
            viewCountDelta: marketVideo.viewCountDelta,
          } satisfies VideoTrendSignal,
        ]),
      ),
    [currentGameSeason?.regionCode, gameMarket, selectedRegionCode],
  );
  const {
    data: gameLeaderboard = [],
    error: gameLeaderboardError,
    isError: isGameLeaderboardError,
    isLoading: isGameLeaderboardLoading,
  } = useGameLeaderboard(accessToken, selectedRegionCode, shouldLoadGame);
  const {
    data: openGamePositions = [],
    error: openGamePositionsError,
  } = useMyGamePositions(accessToken, selectedRegionCode, 'OPEN', shouldLoadGame);
  const {
    data: selectedLeaderboardPositions = [],
    error: selectedLeaderboardPositionsError,
    isError: isSelectedLeaderboardPositionsError,
    isLoading: isSelectedLeaderboardPositionsLoading,
  } = useGameLeaderboardPositions(
    accessToken,
    selectedLeaderboardUserId,
    selectedRegionCode,
    shouldLoadGame && activeGameTab === 'leaderboard' && selectedLeaderboardUserId !== null,
  );
  const {
    data: gameHistoryPositions = [],
    error: gameHistoryPositionsError,
    isLoading: isGameHistoryLoading,
  } = useMyGamePositions(accessToken, selectedRegionCode, '', shouldLoadGame, 30);
  const {
    evaluationPoints: openPositionsEvaluationPoints,
    profitPoints: openPositionsProfitPoints,
    stakePoints: openPositionsBuyPoints,
  } = useMemo(() => summarizeGamePositions(openGamePositions), [openGamePositions]);
  const liveGameCoinOverview = useMemo(() => {
    if (!gameCoinOverview) {
      return undefined;
    }

    const elapsedSeconds = Math.max(0, Math.floor((coinCountdownNow - gameCoinOverviewUpdatedAt) / 1000));

    return {
      ...gameCoinOverview,
      positions: gameCoinOverview.positions.map((position) => ({
        ...position,
        nextPayoutInSeconds:
          typeof position.nextPayoutInSeconds === 'number'
            ? Math.max(0, position.nextPayoutInSeconds - elapsedSeconds)
            : position.nextPayoutInSeconds,
        nextProductionInSeconds:
          typeof position.nextProductionInSeconds === 'number'
            ? Math.max(0, position.nextProductionInSeconds - elapsedSeconds)
            : position.nextProductionInSeconds,
      })),
    };
  }, [coinCountdownNow, gameCoinOverview, gameCoinOverviewUpdatedAt]);
  const nextCoinRefreshInSeconds = useMemo(
    () =>
      getNextCoinRefreshSeconds(
        liveGameCoinOverview?.positions.flatMap((position) => [
          position.nextPayoutInSeconds,
          position.nextProductionInSeconds,
        ]) ?? [],
      ),
    [liveGameCoinOverview],
  );
  const hasCoinCountdown = nextCoinRefreshInSeconds !== null;
  const computedWalletTotalAssetPoints = currentGameSeason
    ? currentGameSeason.wallet.balancePoints + openPositionsEvaluationPoints
    : null;
  const buyGamePositionMutation = useBuyGamePosition(accessToken);
  const sellGamePositionsMutation = useSellGamePositions(accessToken);

  useEffect(() => {
    if (!shouldLoadGame || !hasCoinCountdown) {
      return;
    }

    setCoinCountdownNow(Date.now());

    const intervalId = window.setInterval(() => {
      setCoinCountdownNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasCoinCountdown, shouldLoadGame]);

  useEffect(() => {
    if (!shouldLoadGame || !accessToken || nextCoinRefreshInSeconds === null || nextCoinRefreshInSeconds > 0) {
      return;
    }

    if (lastCoinAutoRefreshAtRef.current === gameCoinOverviewUpdatedAt) {
      return;
    }

    lastCoinAutoRefreshAtRef.current = gameCoinOverviewUpdatedAt;

    void invalidateGameQueries(queryClient, {
      accessToken,
      includeLeaderboardPositions: true,
      regionCode: selectedRegionCode,
    });
  }, [
    accessToken,
    gameCoinOverviewUpdatedAt,
    nextCoinRefreshInSeconds,
    queryClient,
    selectedRegionCode,
    shouldLoadGame,
  ]);

  const {
    data,
    fetchNextPage,
    hasNextPage = false,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = usePopularVideosByCategory(selectedRegionCode, selectedCategory);
  const {
    data: musicChartData,
    fetchNextPage: fetchNextMusicChartPage,
    hasNextPage: hasNextMusicChartPage = false,
    isFetchingNextPage: isFetchingNextMusicChartPage,
    isLoading: isMusicChartLoading,
    isError: isMusicChartError,
  } = useMusicTopVideos(
    selectedRegionCode,
    selectedCategory?.id === ALL_VIDEO_CATEGORY_ID && supportsVideoTrendSignals(ALL_VIDEO_CATEGORY_ID, selectedRegionCode),
  );
  const selectedSection = mergeSections(data?.pages);
  const musicChartSection = useMemo(
    () =>
      selectedCategory?.id === ALL_VIDEO_CATEGORY_ID && supportsVideoTrendSignals(ALL_VIDEO_CATEGORY_ID, selectedRegionCode)
        ? mergeSections(musicChartData?.pages)
        : undefined,
    [musicChartData?.pages, selectedCategory?.id, selectedRegionCode],
  );
  const musicPlaybackSection = useMemo(
    () =>
      musicChartSection
        ? {
            ...musicChartSection,
            categoryId: 'chart:music',
          }
        : undefined,
    [musicChartSection],
  );
  const buyableVideoIdSet = useMemo(
    () => new Set(gameMarket.filter((marketVideo) => marketVideo.canBuy).map((marketVideo) => marketVideo.videoId)),
    [gameMarket],
  );
  const filteredMusicChartSection = useMemo(
    () =>
      isBuyableOnlyFilterActive
        ? filterVideoSection(musicPlaybackSection, (item) => buyableVideoIdSet.has(item.id))
        : musicPlaybackSection,
    [buyableVideoIdSet, isBuyableOnlyFilterActive, musicPlaybackSection],
  );
  const musicTrendSignalsByVideoId = useMemo(
    () => mapMusicTrendSignalsByVideoId(musicPlaybackSection, selectedRegionCode),
    [musicPlaybackSection, selectedRegionCode],
  );
  const extraPlaybackSections = useMemo(
    () => (musicPlaybackSection ? [musicPlaybackSection] : []),
    [musicPlaybackSection],
  );
  const loadedSelectedVideoCount = selectedSection?.items.length ?? 0;
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
  const shouldLoadFavorites = isApiConfigured && authStatus === 'authenticated';
  const isChartLoading =
    isVideoCategoriesLoading || (!selectedCategory && !isVideoCategoriesError) || isLoading;
  const isChartError = isVideoCategoriesError || isError;
  const chartErrorMessage = isVideoCategoriesError
    ? videoCategoriesError instanceof Error
      ? videoCategoriesError.message
      : '카테고리를 불러오지 못했습니다.'
    : error instanceof Error
      ? error.message
      : undefined;
  const {
    data: favoriteStreamers = [],
    error: favoriteStreamersError,
    isError: isFavoriteStreamersError,
    isLoading: isFavoriteStreamersLoading,
  } = useFavoriteStreamers(accessToken, shouldLoadFavorites);
  const {
    data: favoriteStreamerVideosData,
    error: favoriteStreamerVideosError,
    fetchNextPage: fetchNextFavoriteStreamerVideosPage,
    hasNextPage: hasNextFavoriteStreamerVideosPage = false,
    isError: isFavoriteStreamerVideosError,
    isFetchingNextPage: isFetchingNextFavoriteStreamerVideosPage,
    isLoading: isFavoriteStreamerVideosLoading,
  } = useFavoriteStreamerVideos(
    accessToken,
    selectedRegionCode,
    shouldLoadFavorites && favoriteStreamers.length > 0 && isAllCategorySelected,
  );
  const toggleFavoriteStreamerMutation = useToggleFavoriteStreamer(accessToken);
  const favoriteStreamerVideoSection =
    favoriteStreamers.length > 0 && isAllCategorySelected
      ? mergeSections(favoriteStreamerVideosData?.pages) ?? FAVORITE_STREAMER_VIDEO_SECTION
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
      items: openGamePositions.map(mapGamePositionToVideoItem),
      label: '내 보유 포지션',
    }),
    [openGamePositions],
  );
  const historyPlaybackSection = useMemo(
    () => {
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
    },
    [gameHistoryPositions, historyPlaybackVideo],
  );
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
  const isBuyableMusicVideoSearchActive = isBuyableVideoSearchActive({
    hasNextPage: hasNextMusicChartPage,
    isBuyableOnlyFilterActive,
    isBuyableOnlyFilterAvailable,
    isFetchingNextPage: isFetchingNextMusicChartPage,
    loadedItemCount: loadedMusicVideoCount,
  });
  const buyableMusicVideoSearchStatus = isBuyableMusicVideoSearchActive
    ? `매수 가능 영상을 찾는 중 · ${Math.min(loadedMusicVideoCount, 200)}/200개 확인`
    : undefined;
  const displaySelectedPlaybackSection = useMemo(
    () =>
      shouldShowTop200Label
        ? relabelVideoSection(filteredSelectedPlaybackSection, 'TOP 200')
        : filteredSelectedPlaybackSection,
    [filteredSelectedPlaybackSection, shouldShowTop200Label],
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
  const {
    activeChartBuyableOnlyFilterActive,
    activeChartBuyableOnlyFilterAvailable,
    activeChartBuyableVideoSearchStatus,
    activeChartEmptyMessage,
    activeChartErrorMessage,
    activeChartFeaturedSections,
    activeChartHasNextPage,
    activeChartHasResolvedTrendSignals,
    activeChartIsError,
    activeChartIsFetchingNextPage,
    activeChartIsLoading,
    activeChartMainSectionCollapseKey,
    activeChartOnLoadMore,
    activeChartRankLabel,
    activeChartSection,
    activeChartSectionEyebrow,
    activeChartTrendSignalsByVideoId,
    chartViewOptions,
    effectiveChartView,
    handleSelectChartView,
    selectedChartViewOption,
  } = useHomeChartViewState({
    authStatus,
    buyableFavoriteChartSection,
    buyableVideoSearchStatus,
    chartErrorMessage,
    chartTrendSignalsByVideoId,
    displaySelectedPlaybackSection,
    favoriteStreamerVideoErrorMessage,
    favoriteStreamersCount: favoriteStreamers.length,
    favoriteTrendSignalsByVideoId,
    fetchNextFavoriteStreamerVideosPage,
    fetchNextPage,
    featuredChartSections,
    hasNextFavoriteStreamerVideosPage,
    hasNextPage,
    hasResolvedChartTrendSignals,
    hasResolvedFavoriteTrendSignals,
    isBuyableOnlyFilterActive,
    isBuyableOnlyFilterAvailable,
    isChartError,
    isChartLoading,
    isFavoriteStreamerVideosError,
    isFavoriteStreamerVideosLoading,
    isFavoriteStreamersError,
    isFavoriteStreamersLoading,
    isFetchingNextFavoriteStreamerVideosPage,
    isFetchingNextPage,
    isFetchingNextMusicChartPage,
    isMusicChartError,
    isMusicChartLoading,
    isNewChartEntriesError,
    isNewChartEntriesLoading,
    isRealtimeSurgingError,
    isRealtimeSurgingLoading,
    isTrendRegionSelected,
    hasNextMusicChartPage,
    musicBuyableVideoSearchStatus: buyableMusicVideoSearchStatus,
    musicChartSection: filteredMusicChartSection,
    musicTrendSignalsByVideoId,
    onLoadMoreMusicChart: fetchNextMusicChartPage,
    selectedChartView,
    setCollapsedHomeSectionIds,
    setSelectedChartView,
  });
  const {
    activePlaybackQueueId,
    canPlayNextVideo,
    handleManualPlaybackSave,
    handlePlaybackRestoreApplied,
    handlePlayNextVideo,
    handlePlayPreviousVideo,
    handleSelectVideo,
    syncPlaybackSelection,
    isRestoredPlaybackActive,
    isManualPlaybackSavePending,
    manualPlaybackSaveStatus,
    pendingPlaybackRestore,
    resetForRegionChange,
    resolvedSelectedVideo,
    selectedVideoId,
  } = useHomePlaybackState({
    accessToken,
    authStatus,
    extraPlaybackSections,
    favoriteStreamerVideoSection,
    gamePortfolioSection,
    historyPlaybackSection,
    newChartEntriesSection,
    isMobileLayout,
    logout,
    realtimeSurgingSection,
    scrollToPlayerTop: scrollToPlayerStage,
    selectedCategoryId,
    selectedPlaybackSection,
    setSelectedCategoryId,
    sortedVideoCategories,
    user,
    videoPlayerRef,
  });
  const [previewVideoId, setPreviewVideoId] = useState<string | undefined>();
  const selectedPlaybackCategoryLabel = useMemo(
    () =>
      resolvePlaybackCategoryLabel({
        activePlaybackQueueId,
        extraPlaybackSections,
        fallbackLabel: selectedChartViewOption.label,
        favoriteStreamerVideoSection,
        newChartEntriesSection,
        realtimeSurgingSection,
        selectedPlaybackSection: labeledSelectedPlaybackSection,
        selectedVideoId,
      }),
    [
      activePlaybackQueueId,
      extraPlaybackSections,
      favoriteStreamerVideoSection,
      labeledSelectedPlaybackSection,
      newChartEntriesSection,
      realtimeSurgingSection,
      selectedChartViewOption.label,
      selectedVideoId,
    ],
  );
  const {
    activeTradeModal,
    buyQuantity,
    closeCoinModal,
    closeRankHistoryModal,
    closeTradeModal,
    getRemainingHoldSeconds,
    isCoinModalOpen,
    openCoinModal,
    openRankHistoryModal,
    selectedRankHistoryPosition,
    selectedVideoRankHistoryVideoId,
    sellQuantity,
    setActiveTradeModal,
    setBuyQuantity,
    setGameActionStatus,
    setSellQuantity,
  } = useHomeGameUiState({
    authStatus,
    currentGameSeason,
    openGamePositions,
    selectedVideoId: selectedOpenPositionId != null ? `${selectedVideoId ?? ''}:${selectedOpenPositionId}` : selectedVideoId,
  });
  const openDistinctVideoCount = new Set(openGamePositions.map((position) => position.videoId)).size;
  const isRankingGameCollapsed = collapsedHomeSectionIds.includes(RANKING_GAME_SECTION_ID);
  const collapsedFeaturedSectionIds = collapsedHomeSectionIds;
  const toggleCollapsedSection = useCallback((sectionId: string) => {
    setCollapsedHomeSectionIds((currentSectionIds) =>
      currentSectionIds.includes(sectionId)
        ? currentSectionIds.filter((currentSectionId) => currentSectionId !== sectionId)
        : [...currentSectionIds, sectionId],
    );
  }, []);

  const {
    data: selectedPositionRankHistory,
    error: selectedPositionRankHistoryError,
    isLoading: isPositionRankHistoryLoading,
  } = useGamePositionRankHistory(
    accessToken,
    selectedRankHistoryPosition?.id ?? null,
    shouldLoadGame && Boolean(selectedRankHistoryPosition),
  );
  const relatedRankHistoryPositions = useMemo(
    () =>
      selectedRankHistoryPosition?.videoId
        ? gameHistoryPositions
            .filter((position) => position.videoId === selectedRankHistoryPosition.videoId)
            .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
        : [],
    [gameHistoryPositions, selectedRankHistoryPosition],
  );
  const relatedPositionRankHistoryQueries = useQueries({
    queries: relatedRankHistoryPositions.map((position) => ({
      enabled: shouldLoadGame && Boolean(accessToken) && Boolean(selectedRankHistoryPosition) && position.id !== selectedRankHistoryPosition?.id,
      queryKey: gameQueryKeys.positionRankHistory(accessToken, position.id),
      queryFn: () => fetchGamePositionRankHistory(accessToken as string, position.id),
      staleTime: 1000 * 15,
    })),
  });
  const {
    data: selectedVideoRankHistory,
    error: selectedVideoRankHistoryError,
    isLoading: isVideoRankHistoryLoading,
  } = useVideoRankHistory(
    currentGameSeason?.regionCode ?? VIDEO_GAME_REGION_CODE,
    selectedRankHistoryPosition?.videoId ?? selectedVideoRankHistoryVideoId ?? undefined,
    isApiConfigured && Boolean(selectedRankHistoryPosition?.videoId ?? selectedVideoRankHistoryVideoId),
  );

  useLogoutOnUnauthorized(favoriteStreamersError, logout);
  useLogoutOnUnauthorized(favoriteStreamerVideosError, logout);
  useLogoutOnUnauthorized(currentGameSeasonError, logout);
  useLogoutOnUnauthorized(gameLeaderboardError, logout);
  useLogoutOnUnauthorized(gameCoinOverviewError, logout);
  useLogoutOnUnauthorized(gameCoinTierProgressError, logout);
  useLogoutOnUnauthorized(gameMarketError, logout);
  useLogoutOnUnauthorized(openGamePositionsError, logout);
  useLogoutOnUnauthorized(gameHistoryPositionsError, logout);
  useLogoutOnUnauthorized(selectedPositionRankHistoryError, logout);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      return;
    }

    setSelectedOpenPositionId(null);
    setActiveGameTab('positions');
    setHistoryPlaybackLoadingVideoId(null);
    setHistoryPlaybackVideo(null);
  }, [authStatus]);

  useEffect(() => {
    if (selectedOpenPositionId == null) {
      return;
    }

    const hasSelectedPosition =
      activePlaybackQueueId === GAME_PORTFOLIO_QUEUE_ID
        ? openGamePositions.some((position) => position.id === selectedOpenPositionId)
        : activePlaybackQueueId === HISTORY_PLAYBACK_QUEUE_ID
          ? gameHistoryPositions.some((position) => position.id === selectedOpenPositionId)
          : openGamePositions.some((position) => position.id === selectedOpenPositionId) ||
            gameHistoryPositions.some((position) => position.id === selectedOpenPositionId);

    if (!hasSelectedPosition) {
      setSelectedOpenPositionId(null);
    }
  }, [activePlaybackQueueId, gameHistoryPositions, openGamePositions, selectedOpenPositionId]);

  useEffect(() => {
    if (!selectedVideoId) {
      return;
    }

    if (activePlaybackQueueId === GAME_PORTFOLIO_QUEUE_ID) {
      const currentOpenPosition = openGamePositions.find((position) => position.id === selectedOpenPositionId);

      if (currentOpenPosition?.videoId === selectedVideoId) {
        return;
      }

      const nextOpenPosition = openGamePositions.find((position) => position.videoId === selectedVideoId);

      if ((nextOpenPosition?.id ?? null) !== selectedOpenPositionId) {
        setSelectedOpenPositionId(nextOpenPosition?.id ?? null);
      }

      return;
    }

    if (activePlaybackQueueId === HISTORY_PLAYBACK_QUEUE_ID) {
      const currentHistoryPosition = gameHistoryPositions.find((position) => position.id === selectedOpenPositionId);

      if (currentHistoryPosition?.videoId === selectedVideoId) {
        return;
      }

      const nextHistoryPosition = gameHistoryPositions.find((position) => position.videoId === selectedVideoId);

      if ((nextHistoryPosition?.id ?? null) !== selectedOpenPositionId) {
        setSelectedOpenPositionId(nextHistoryPosition?.id ?? null);
      }
    }
  }, [
    activePlaybackQueueId,
    gameHistoryPositions,
    openGamePositions,
    selectedOpenPositionId,
    selectedVideoId,
  ]);

  useEffect(() => {
    if (isBuyableOnlyFilterAvailable) {
      return;
    }

    setIsBuyableOnlyFilterActive(false);
  }, [isBuyableOnlyFilterAvailable]);

  useEffect(() => {
    if (!shouldAutoPrefetchBuyableVideos) {
      return;
    }

    void fetchNextPage();
  }, [fetchNextPage, shouldAutoPrefetchBuyableVideos]);

  useEffect(() => {
    if (!shouldAutoPrefetchBuyableMusicVideos) {
      return;
    }

    void fetchNextMusicChartPage();
  }, [fetchNextMusicChartPage, shouldAutoPrefetchBuyableMusicVideos]);

  function handleSelectRegion(regionCode: RegionCode) {
    resetForRegionChange();
    setSelectedCategoryId(DEFAULT_CATEGORY_ID);
    setPendingRegionTopVideoSelection(regionCode);
    updateRegionCode(regionCode);
    setIsRegionModalOpen(false);
  }

  function handleSelectChartViewFromModal(viewId: string, triggerElement?: HTMLButtonElement) {
    handleSelectChartView(viewId, triggerElement);
    handleSelectTopVideoForChartView(viewId as ChartViewMode);
    setIsChartViewModalOpen(false);
  }

  const openGameHoldings = useMemo(
    () => buildOpenGameHoldings(openGamePositions, getRemainingHoldSeconds),
    [getRemainingHoldSeconds, openGamePositions],
  );
  const {
    buyActionTitle,
    buyModalHelperText,
    favoriteToggleLabel,
    gameSeasonRegionMismatch,
    isChartActionDisabled,
    isSelectedChannelFavorited,
    isSelectedVideoBuyDisabled,
    isSelectedVideoSellDisabled,
    maxBuyQuantity,
    maxSellQuantity,
    normalizedBuyQuantity,
    normalizedSellQuantity,
    selectedChannelId,
    selectedGameActionChannelTitle,
    selectedGameActionTitle,
    selectedVideoCurrentChartRank,
    selectedVideoHistoricalPosition,
    selectedVideoHistoryTargetPosition,
    selectedVideoIsChartOut,
    selectedVideoMarketEntry,
    selectedVideoOpenPositionCount,
    selectedVideoOpenPositionSummary,
    selectedVideoRankLabel,
    selectedVideoSellSummary,
    selectedVideoStatLabel,
    selectedVideoTradeThumbnailUrl,
    selectedVideoTrendBadges,
    selectedVideoUnitPricePoints,
    sellActionTitle,
    sellModalHelperText,
    totalSelectedVideoBuyPoints,
  } = useSelectedVideoGameState({
    authStatus,
    buyQuantity,
    canShowGameActions,
    currentGameSeason,
    currentGameSeasonError,
    favoriteStreamers,
    favoriteTrendSignalsByVideoId,
    gameHistoryPositions,
    gameMarket,
    getRemainingHoldSeconds,
    isBuySubmitting: buyGamePositionMutation.isPending,
    isCurrentGameSeasonLoading,
    isFavoriteTogglePending: toggleFavoriteStreamerMutation.isPending,
    openGameHoldings,
    openGamePositions,
    resolvedSelectedVideo,
    selectedOpenPositionId,
    selectedCategoryId,
    selectedCategoryLabel: selectedPlaybackCategoryLabel,
    selectedCountryName,
    selectedRegionCode,
    selectedVideoId,
    selectedVideoRankSignalById: selectedVideoRankSignalsById,
    sellQuantity,
  });
  const selectedSellPositionId = useMemo(
    () =>
      selectedOpenPositionId != null &&
      openGamePositions.some((position) => position.id === selectedOpenPositionId)
        ? selectedOpenPositionId
        : null,
    [openGamePositions, selectedOpenPositionId],
  );

  const {
    handleBuyCurrentVideo,
    handleSellCurrentVideo,
    isBuySubmitting,
    isSellSubmitting,
    openBuyTradeModal,
    openSellTradeModal,
  } = useHomeGameTradeActions({
    authStatus,
    buyQuantity,
    currentGameSeason,
    currentGameSeasonError,
    gameSeasonRegionMismatch,
    logout,
    maxBuyQuantity,
    maxSellQuantity,
    mutateBuyGamePosition: buyGamePositionMutation.mutateAsync,
    mutateSellGamePositions: sellGamePositionsMutation.mutateAsync,
    selectedOpenPositionId: selectedSellPositionId,
    selectedGameActionTitle,
    selectedVideoId,
    selectedVideoMarketEntry,
    selectedRegionCode,
    sellQuantity,
    setActiveTradeModal,
    setBuyQuantity,
    setGameActionStatus,
    setSellQuantity,
    totalSelectedVideoBuyPoints,
  });

  const selectedVideoBuyCoinSummary = useMemo(() => {
    if (!liveGameCoinOverview || typeof totalSelectedVideoBuyPoints !== 'number') {
      return null;
    }

    const matchingRank = liveGameCoinOverview.ranks.find((rank) => rank.rank === selectedVideoCurrentChartRank);

    if (!matchingRank) {
      return {
        estimatedCoinYield: null,
        nextEvaluationPoints: selectedVideoOpenPositionSummary.evaluationPoints + totalSelectedVideoBuyPoints,
      };
    }

    return {
      estimatedCoinYield: calculateEstimatedCoinYieldAfterBuy(
        selectedVideoOpenPositionSummary.evaluationPoints,
        totalSelectedVideoBuyPoints,
        matchingRank.coinRatePercent,
      ),
      nextEvaluationPoints: selectedVideoOpenPositionSummary.evaluationPoints + totalSelectedVideoBuyPoints,
    };
  }, [
    liveGameCoinOverview,
    selectedVideoCurrentChartRank,
    selectedVideoOpenPositionSummary.evaluationPoints,
    totalSelectedVideoBuyPoints,
  ]);

  async function handleToggleFavoriteStreamer() {
    if (authStatus !== 'authenticated' || !resolvedSelectedVideo || !selectedChannelId) {
      return;
    }

    try {
      await toggleFavoriteStreamerMutation.mutateAsync({
        channelId: selectedChannelId,
        channelTitle: resolvedSelectedVideo.snippet.channelTitle,
        isFavorited: isSelectedChannelFavorited,
        thumbnailUrl: resolvedSelectedVideo.snippet.thumbnails.high.url || null,
      });
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.code === 'unauthorized' || error.code === 'session_expired')
      ) {
        void logout();
      }
    }
  }

  useEffect(() => {
    setPreviewVideoId(selectedVideoId);
  }, [selectedVideoId]);

  const handleSelectVideoWithPreview = useCallback(
    (videoId: string, playbackQueueId: string) => {
      if (!videoId) {
        return;
      }

      const nextPreviewVideoId = videoId;
      setPreviewVideoId(nextPreviewVideoId);
      handleSelectVideo(nextPreviewVideoId, playbackQueueId);
    },
    [handleSelectVideo],
  );

  const handleSelectTopVideoForChartView = useCallback(
    (viewId: ChartViewMode) => {
      const targetSection =
        viewId === 'favorites'
          ? buyableFavoriteChartSection
          : viewId === 'music'
            ? filteredMusicChartSection
            : viewId === 'realtime-surging'
              ? realtimeSurgingSection
              : viewId === 'new-chart-entries'
                ? newChartEntriesSection
                : displaySelectedPlaybackSection;
      const topVideoId = targetSection?.items[0]?.id;

      if (!topVideoId || !targetSection?.categoryId) {
        return;
      }

      handleSelectVideoWithPreview(topVideoId, targetSection.categoryId);
    },
    [
      buyableFavoriteChartSection,
      displaySelectedPlaybackSection,
      filteredMusicChartSection,
      handleSelectVideoWithPreview,
      newChartEntriesSection,
      realtimeSurgingSection,
    ],
  );

  const handlePlayNextVideoWithPreview = useCallback(() => {
    if (isRestoredPlaybackActive) {
      const topChartVideoId = selectedPlaybackSection?.items[0]?.id;
      const topChartQueueId = selectedPlaybackSection?.categoryId;

      if (topChartVideoId && topChartQueueId) {
        setSelectedOpenPositionId(null);
        setPreviewVideoId(topChartVideoId);
        handleSelectVideo(topChartVideoId, topChartQueueId);
        return;
      }
    }

    if (activePlaybackQueueId === GAME_PORTFOLIO_QUEUE_ID) {
      const nextOpenPosition = getAdjacentGamePosition(openGamePositions, {
        currentPositionId: selectedOpenPositionId,
        currentVideoId: selectedVideoId,
        skipSameVideoId: true,
        step: 1,
      });

      if (nextOpenPosition) {
        setSelectedOpenPositionId(nextOpenPosition.id);
        setPreviewVideoId(nextOpenPosition.videoId);
        syncPlaybackSelection(nextOpenPosition.videoId, GAME_PORTFOLIO_QUEUE_ID);
        return;
      }
    }

    if (activePlaybackQueueId === HISTORY_PLAYBACK_QUEUE_ID) {
      const nextHistoryPosition = getAdjacentGamePosition(gameHistoryPositions, {
        currentPositionId: selectedOpenPositionId,
        currentVideoId: selectedVideoId,
        skipSameVideoId: true,
        step: 1,
      });

      if (nextHistoryPosition) {
        setSelectedOpenPositionId(nextHistoryPosition.id);
        setPreviewVideoId(nextHistoryPosition.videoId);
        syncPlaybackSelection(nextHistoryPosition.videoId, HISTORY_PLAYBACK_QUEUE_ID);
        return;
      }
    }

    const playbackItems = selectedPlaybackSection?.items ?? [];
    const currentIndex = playbackItems.findIndex((item) => item.id === selectedVideoId);
    const nextVideoId =
      currentIndex >= 0 && currentIndex < playbackItems.length - 1
        ? playbackItems[currentIndex + 1]?.id
        : undefined;

    if (nextVideoId) {
      setPreviewVideoId(nextVideoId);
    }

    handlePlayNextVideo();
  }, [
    activePlaybackQueueId,
    gameHistoryPositions,
    handlePlayNextVideo,
    handleSelectVideo,
    syncPlaybackSelection,
    isRestoredPlaybackActive,
    openGamePositions,
    selectedOpenPositionId,
    selectedPlaybackSection,
    selectedVideoId,
  ]);

  const handlePlayPreviousVideoWithPreview = useCallback(() => {
    if (activePlaybackQueueId === GAME_PORTFOLIO_QUEUE_ID) {
      const previousOpenPosition = getAdjacentGamePosition(openGamePositions, {
        currentPositionId: selectedOpenPositionId,
        currentVideoId: selectedVideoId,
        skipSameVideoId: true,
        step: -1,
      });

      if (previousOpenPosition) {
        setSelectedOpenPositionId(previousOpenPosition.id);
        setPreviewVideoId(previousOpenPosition.videoId);
        syncPlaybackSelection(previousOpenPosition.videoId, GAME_PORTFOLIO_QUEUE_ID);
        return;
      }
    }

    if (activePlaybackQueueId === HISTORY_PLAYBACK_QUEUE_ID) {
      const previousHistoryPosition = getAdjacentGamePosition(gameHistoryPositions, {
        currentPositionId: selectedOpenPositionId,
        currentVideoId: selectedVideoId,
        skipSameVideoId: true,
        step: -1,
      });

      if (previousHistoryPosition) {
        setSelectedOpenPositionId(previousHistoryPosition.id);
        setPreviewVideoId(previousHistoryPosition.videoId);
        syncPlaybackSelection(previousHistoryPosition.videoId, HISTORY_PLAYBACK_QUEUE_ID);
        return;
      }
    }

    const playbackItems = selectedPlaybackSection?.items ?? [];
    const currentIndex = playbackItems.findIndex((item) => item.id === selectedVideoId);
    const previousVideoId =
      currentIndex > 0
        ? playbackItems[currentIndex - 1]?.id
        : undefined;

    if (previousVideoId) {
      setPreviewVideoId(previousVideoId);
    }

    handlePlayPreviousVideo();
  }, [
    activePlaybackQueueId,
    gameHistoryPositions,
    handlePlayPreviousVideo,
    syncPlaybackSelection,
    openGamePositions,
    selectedOpenPositionId,
    selectedPlaybackSection,
    selectedVideoId,
  ]);

  const handlePauseCurrentVideo = useCallback(() => {
    videoPlayerRef.current?.pausePlayback();
  }, []);

  const handleResumeCurrentVideo = useCallback(() => {
    videoPlayerRef.current?.resumePlayback();
  }, []);

  const handlePlaybackStateChange = useCallback((state: 'paused' | 'playing') => {
    setIsPlaybackPaused(state === 'paused');
  }, []);

  useEffect(() => {
    setIsPlaybackPaused(false);
  }, [selectedVideoId]);

  useEffect(() => {
    if (!pendingRegionTopVideoSelection || pendingRegionTopVideoSelection !== selectedRegionCode) {
      return;
    }

    if (activeChartIsLoading) {
      return;
    }

    if (activeChartIsError) {
      setPendingRegionTopVideoSelection(null);
      return;
    }

    const topVideoId = activeChartSection?.items[0]?.id;

    if (!topVideoId || !activeChartSection?.categoryId) {
      setPendingRegionTopVideoSelection(null);
      return;
    }

    handleSelectVideoWithPreview(topVideoId, activeChartSection.categoryId);
    setPendingRegionTopVideoSelection(null);
  }, [
    activeChartIsError,
    activeChartIsLoading,
    activeChartSection,
    handleSelectVideoWithPreview,
    pendingRegionTopVideoSelection,
    selectedRegionCode,
  ]);

  const handleSelectGamePositionVideo = useCallback(
    (position: GamePosition) => {
      setSelectedOpenPositionId(position.id);
      scrollToPlayerStage();
      handleSelectVideoWithPreview(position.videoId, gamePortfolioSection.categoryId);
    },
    [gamePortfolioSection.categoryId, handleSelectVideoWithPreview, scrollToPlayerStage],
  );
  const handleSelectGameHistoryVideo = useCallback(
    async (position: GamePosition, _playbackQueueId?: string) => {
      scrollToPlayerStage();

      const historyVideo = mapGamePositionToVideoItem(position);

      if (historyVideo.id) {
        setHistoryPlaybackVideo(historyVideo);
        setGameActionStatus(null);
        setSelectedOpenPositionId(position.id);
        handleSelectVideoWithPreview(historyVideo.id, HISTORY_PLAYBACK_QUEUE_ID);
        return;
      }

      setHistoryPlaybackLoadingVideoId(position.videoId);

      try {
        const video = await fetchVideoById(position.videoId);
        setHistoryPlaybackVideo(video);
        setGameActionStatus(null);
        setSelectedOpenPositionId(position.id);
        handleSelectVideoWithPreview(video.id, HISTORY_PLAYBACK_QUEUE_ID);
      } catch (error) {
        setGameActionStatus(
          error instanceof Error
            ? error.message
            : '이 거래 영상 정보를 다시 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );
      } finally {
        setHistoryPlaybackLoadingVideoId(null);
      }
    },
    [handleSelectVideoWithPreview, scrollToPlayerStage, setGameActionStatus],
  );
  const handleSelectLeaderboardPositionVideo = useCallback(
    async (position: GamePosition, playbackQueueId?: string) => {
      scrollToPlayerStage();

      if (playbackQueueId) {
        setGameActionStatus(null);
        setSelectedOpenPositionId(position.id);
        handleSelectVideoWithPreview(position.videoId, playbackQueueId);
        return;
      }

      setHistoryPlaybackLoadingVideoId(position.videoId);

      try {
        const video = await fetchVideoById(position.videoId);
        setHistoryPlaybackVideo(video);
        setGameActionStatus(null);
        setSelectedOpenPositionId(position.id);
        handleSelectVideoWithPreview(video.id, HISTORY_PLAYBACK_QUEUE_ID);
      } catch (error) {
        setGameActionStatus(
          error instanceof Error
            ? error.message
            : '이 리더보드 영상 정보를 다시 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );
      } finally {
        setHistoryPlaybackLoadingVideoId(null);
      }
    },
    [handleSelectVideoWithPreview, scrollToPlayerStage, setGameActionStatus],
  );
  const handleSelectGameTab = useCallback((tab: 'positions' | 'history' | 'leaderboard') => {
    startTransition(() => {
      setActiveGameTab(tab);
    });
  }, []);
  const handleOpenSelectedVideoRankHistory = useCallback(() => {
    openRankHistoryModal(
      selectedVideoId,
      selectedVideoHistoryTargetPosition,
    );
  }, [
    openRankHistoryModal,
    selectedVideoHistoryTargetPosition,
    selectedVideoId,
  ]);
  const positionsEmptyMessage = currentGameSeason
    ? canShowGameActions
      ? '아직 보유 중인 영상이 없어요. 지금 보는 영상에서 바로 시작할 수 있습니다.'
      : '새 포지션 매수와 기존 포지션 매도는 전체 카테고리에서만 가능합니다.'
    : null;
  const renderSelectedVideoActionsContent = (
    panelControls?: ReactNode,
    onHeaderClick?: () => void,
    onContentClick?: () => void,
    options?: {
      desktopPlayerDockSlotRef?: RefObject<HTMLDivElement | null>;
      isDesktopMiniPlayerEnabled?: boolean;
      onEyebrowClick?: () => void;
    },
  ) => (
    <SelectedVideoGameActionsBundle
      buyActionTitle={buyActionTitle}
      canShowGameActions={canShowGameActions}
      desktopPlayerDockSlotRef={options?.desktopPlayerDockSlotRef}
      fallbackRankLabel={selectedVideoRankLabel}
      fallbackViewCountLabel={selectedVideoStatLabel}
      gameCoinOverview={liveGameCoinOverview}
      isDesktopMiniPlayerEnabled={options?.isDesktopMiniPlayerEnabled ?? false}
      isBuySubmitting={isBuySubmitting}
      isChartDisabled={isChartActionDisabled}
      isSelectedVideoBuyDisabled={isSelectedVideoBuyDisabled}
      isSelectedVideoSellDisabled={isSelectedVideoSellDisabled}
      isSellSubmitting={isSellSubmitting}
      mainPlayerRef={videoPlayerRef}
      maxSellQuantity={maxSellQuantity}
      onContentClick={onContentClick}
      onEyebrowClick={options?.onEyebrowClick}
      mode="panel"
      onHeaderClick={onHeaderClick}
      onOpenBuyTradeModal={openBuyTradeModal}
      onOpenRankHistory={handleOpenSelectedVideoRankHistory}
      onOpenSellTradeModal={openSellTradeModal}
      panelControls={panelControls}
      selectedGameActionChannelTitle={selectedGameActionChannelTitle}
      selectedGameActionTitle={selectedGameActionTitle}
      selectedOpenPositionId={selectedOpenPositionId}
      selectedVideoCurrentChartRank={selectedVideoCurrentChartRank}
      selectedVideoHistoricalPosition={selectedVideoHistoricalPosition}
      selectedVideoId={selectedVideoId}
      selectedVideoIsChartOut={selectedVideoIsChartOut}
      selectedVideoMarketEntry={selectedVideoMarketEntry}
      selectedVideoOpenPositionCount={selectedVideoOpenPositionCount}
      selectedVideoOpenPositionSummary={selectedVideoOpenPositionSummary}
      selectedVideoTradeThumbnailUrl={selectedVideoTradeThumbnailUrl}
      selectedVideoTrendBadges={selectedVideoTrendBadges}
      sellActionTitle={sellActionTitle}
    />
  );
  const gameActionContent = (
    <SelectedVideoGameActionsBundle
      buyActionTitle={buyActionTitle}
      canShowGameActions={canShowGameActions}
      fallbackRankLabel={selectedVideoRankLabel}
      fallbackViewCountLabel={selectedVideoStatLabel}
      gameCoinOverview={liveGameCoinOverview}
      isBuySubmitting={isBuySubmitting}
      isSelectedVideoBuyDisabled={isSelectedVideoBuyDisabled}
      isSelectedVideoSellDisabled={isSelectedVideoSellDisabled}
      isSellSubmitting={isSellSubmitting}
      mode="stage"
      onOpenBuyTradeModal={openBuyTradeModal}
      onOpenRankHistory={handleOpenSelectedVideoRankHistory}
      onOpenSellTradeModal={openSellTradeModal}
      selectedGameActionChannelTitle={selectedGameActionChannelTitle}
      selectedOpenPositionId={selectedOpenPositionId}
      selectedVideoCurrentChartRank={selectedVideoCurrentChartRank}
      selectedVideoHistoricalPosition={selectedVideoHistoricalPosition}
      selectedVideoId={selectedVideoId}
      selectedVideoIsChartOut={selectedVideoIsChartOut}
      selectedVideoMarketEntry={selectedVideoMarketEntry}
      selectedVideoOpenPositionCount={selectedVideoOpenPositionCount}
      selectedVideoOpenPositionSummary={selectedVideoOpenPositionSummary}
      selectedVideoTrendBadges={selectedVideoTrendBadges}
      sellActionTitle={sellActionTitle}
    />
  );
  const stageMetadataContent = (
    <GameSelectedVideoPriceSummary
      fallbackRankLabel={selectedVideoRankLabel}
      fallbackViewCountLabel={selectedVideoStatLabel}
      gameCoinOverview={liveGameCoinOverview}
      maxSellQuantity={maxSellQuantity}
      preferMarketSummary
      selectedOpenPositionId={selectedOpenPositionId}
      selectedVideoCurrentChartRank={selectedVideoCurrentChartRank}
      selectedVideoHistoricalPosition={selectedVideoHistoricalPosition}
      selectedVideoId={selectedVideoId}
      selectedVideoIsChartOut={selectedVideoIsChartOut}
      selectedVideoMarketEntry={selectedVideoMarketEntry}
      selectedVideoOpenPositionCount={selectedVideoOpenPositionCount}
      selectedVideoOpenPositionSummary={selectedVideoOpenPositionSummary}
      selectedVideoTrendBadges={selectedVideoTrendBadges}
    />
  );
  const portfolioContent = (
    <GamePanelSection
      activeGameTab={activeGameTab}
      activePlaybackQueueId={activePlaybackQueueId}
      authStatus={authStatus}
      canShowGameActions={canShowGameActions}
      coinOverview={liveGameCoinOverview}
      coinTierProgress={gameCoinTierProgress}
      computedWalletTotalAssetPoints={computedWalletTotalAssetPoints}
      currentGameSeason={currentGameSeason}
      currentGameSeasonUpdatedAt={currentGameSeasonUpdatedAt}
      favoriteStreamerVideoSection={favoriteStreamerVideoSection}
      favoriteTrendSignalsByVideoId={favoriteTrendSignalsByVideoId}
      gameHistoryPositions={gameHistoryPositions}
      gameLeaderboard={gameLeaderboard}
      gameLeaderboardError={gameLeaderboardError}
      gameMarketSignalsByVideoId={gameMarketSignalsByVideoId}
      gamePortfolioSection={gamePortfolioSection}
      hasApiConfigured={isApiConfigured}
      historyPlaybackLoadingVideoId={historyPlaybackLoadingVideoId}
      historyPlaybackSection={historyPlaybackSection}
      isCollapsed={isRankingGameCollapsed}
      isGameHistoryLoading={isGameHistoryLoading}
      isGameLeaderboardError={isGameLeaderboardError}
      isGameLeaderboardLoading={isGameLeaderboardLoading}
      isSelectedLeaderboardPositionsError={isSelectedLeaderboardPositionsError}
      isSelectedLeaderboardPositionsLoading={isSelectedLeaderboardPositionsLoading}
      newChartEntriesSection={newChartEntriesSection}
      onOpenCoinModal={openCoinModal}
      onSelectGameHistoryVideo={handleSelectGameHistoryVideo}
      onSelectGamePositionVideo={handleSelectGamePositionVideo}
      onSelectLeaderboardPositionVideo={handleSelectLeaderboardPositionVideo}
      onSelectTab={handleSelectGameTab}
      onToggleCollapse={() => toggleCollapsedSection(RANKING_GAME_SECTION_ID)}
      openDistinctVideoCount={openDistinctVideoCount}
      openGameHoldings={openGameHoldings}
      openPositionsBuyPoints={openPositionsBuyPoints}
      openPositionsEvaluationPoints={openPositionsEvaluationPoints}
      openPositionsProfitPoints={openPositionsProfitPoints}
      positionsEmptyMessage={positionsEmptyMessage}
      realtimeSurgingSection={realtimeSurgingSection}
      selectedLeaderboardPositions={selectedLeaderboardPositions}
      selectedLeaderboardPositionsError={selectedLeaderboardPositionsError}
      selectedLeaderboardUserId={selectedLeaderboardUserId}
      selectedPlaybackSection={selectedPlaybackSection}
      selectedVideoActions={null}
      selectedPositionId={selectedOpenPositionId}
      selectedVideoId={selectedVideoId}
      setSelectedLeaderboardUserId={setSelectedLeaderboardUserId}
      trendSignalsByVideoId={chartTrendSignalsByVideoId}
    />
  );
  const isRankHistoryModalOpen = Boolean(selectedRankHistoryPosition || selectedVideoRankHistoryVideoId);
  const relatedPositionRankHistories = useMemo(
    () =>
      relatedPositionRankHistoryQueries
        .map((query) => query.data)
        .filter((history): history is GamePositionRankHistory => Boolean(history)),
    [relatedPositionRankHistoryQueries],
  );
  const relatedPositionRankHistoryError = relatedPositionRankHistoryQueries.find((query) => query.error)?.error;
  const isRelatedPositionRankHistoryLoading = relatedPositionRankHistoryQueries.some((query) => query.isLoading);
  const mergedRankHistory = useMemo(
    () =>
      mergeMultiplePositionHistories(
        selectedPositionRankHistory
          ? [selectedPositionRankHistory, ...relatedPositionRankHistories]
          : relatedPositionRankHistories,
        selectedVideoRankHistory,
      ),
    [relatedPositionRankHistories, selectedPositionRankHistory, selectedVideoRankHistory],
  );
  const isBuyTradeModalOpen =
    activeTradeModal === 'buy' && Boolean(selectedVideoId) && Boolean(selectedVideoMarketEntry);
  const isSellTradeModalOpen =
    activeTradeModal === 'sell' && Boolean(selectedVideoId) && selectedVideoOpenPositionCount > 0;
  const isAnyModalOpen =
    isRankHistoryModalOpen ||
    isRegionModalOpen ||
    isCoinModalOpen ||
    isBuyTradeModalOpen ||
    isSellTradeModalOpen;
  const buyableVideoSearchOverlay =
    isBuyableVideoSearchLoading && !isAnyModalOpen ? (
      <div className="app-shell__fullscreen-loading" role="status" aria-live="polite" aria-modal="true">
        <div className="app-shell__fullscreen-loading-card">
          <span className="app-shell__fullscreen-loading-spinner" aria-hidden="true" />
          <p className="app-shell__fullscreen-loading-eyebrow">Buyable Scan</p>
          <p className="app-shell__fullscreen-loading-title">매수 가능 영상 탐색 중</p>
          <p className="app-shell__fullscreen-loading-copy">
            상위 차트 영상을 순차적으로 확인하고 있습니다. 잠시만 기다려 주세요.
          </p>
          {buyableVideoSearchStatus ? (
            <p className="app-shell__fullscreen-loading-status">{buyableVideoSearchStatus}</p>
          ) : null}
        </div>
      </div>
    ) : null;
  const buyableVideoSearchOverlayContainer =
    typeof document === 'undefined'
      ? null
      : (() => {
          const fullscreenElement = getFullscreenElement();

          return fullscreenElement instanceof HTMLElement ? fullscreenElement : document.body;
        })();

  return (
    <div className="app-shell">
      <AppHeader
        authStatus={authStatus}
        isDarkMode={isDarkMode}
        isLoggingOut={isLoggingOut}
        onLogout={() => void logout()}
        onToggleThemeMode={handleToggleThemeMode}
        themeToggleLabel={themeToggleLabel}
        user={user}
      />
      <main className="app-shell__main">
        <HomePlaybackSection
          preferredPreviewVideoId={previewVideoId}
          isStickySelectedVideoPlaybackPaused={isPlaybackPaused}
          onPauseStickySelectedVideo={handlePauseCurrentVideo}
          onPlayNextStickySelectedVideo={handlePlayNextVideoWithPreview}
          onPlayPreviousStickySelectedVideo={handlePlayPreviousVideoWithPreview}
          onResumeStickySelectedVideo={handleResumeCurrentVideo}
          chartPanelProps={{
            buyableVideoSearchStatus: activeChartBuyableVideoSearchStatus,
            chartErrorMessage: activeChartErrorMessage,
            collapsedFeaturedSectionIds,
            currentTierCode: gameCoinTierProgress?.currentTier.tierCode,
            featuredSections: activeChartFeaturedSections,
            getRankLabel: activeChartRankLabel,
            hasNextPage: activeChartHasNextPage,
            hasResolvedTrendSignals: activeChartHasResolvedTrendSignals,
            isBuyableOnlyFilterActive: activeChartBuyableOnlyFilterActive,
            isBuyableOnlyFilterAvailable: activeChartBuyableOnlyFilterAvailable,
            isChartError: activeChartIsError,
            isChartLoading: activeChartIsLoading,
            isFetchingNextPage: activeChartIsFetchingNextPage,
            mainSectionCollapseKey: activeChartMainSectionCollapseKey,
            onLoadMore: activeChartOnLoadMore,
            onSelectVideo: handleSelectVideoWithPreview,
            onToggleBuyableOnlyFilter: () => setIsBuyableOnlyFilterActive((current) => !current),
            onToggleFeaturedSectionCollapse: toggleCollapsedSection,
            primarySectionEyebrow: activeChartSectionEyebrow,
            section: activeChartSection,
            sectionEmptyMessage: activeChartEmptyMessage,
            selectedCategoryLabel: selectedChartViewOption.label,
            selectedCountryName,
            activePlaybackQueueId,
            selectedVideoId,
            trendSignalsByVideoId: activeChartTrendSignalsByVideoId,
          }}
          communityPanelProps={{
            selectedVideoId,
            selectedVideoTitle: resolvedSelectedVideo?.snippet.title,
          }}
          filterBarProps={{
            onOpenRegionModal: () => setIsRegionModalOpen(true),
            onSelectView: handleSelectChartView,
            selectedCountryName,
            selectedViewId: effectiveChartView,
            viewOptions: chartViewOptions,
          }}
          playerStageProps={{
            authStatus,
            canNavigateVideos: canPlayNextVideo,
            cinematicToggleLabel,
            favoriteToggleLabel,
            isChartLoading,
            isCinematicModeActive,
            isFavoriteToggleDisabled: !selectedChannelId || toggleFavoriteStreamerMutation.isPending,
            isManualPlaybackSaveDisabled:
              authStatus !== 'authenticated' || !selectedVideoId || isManualPlaybackSavePending,
            isMobileLayout,
            isSelectedChannelFavorited,
            manualPlaybackSaveButtonLabel: isManualPlaybackSavePending ? '저장 중...' : '저장',
            manualPlaybackSaveStatus: manualPlaybackSaveStatus ?? undefined,
            onManualPlaybackSave: () => void handleManualPlaybackSave(),
            onNextVideo: handlePlayNextVideoWithPreview,
            onOpenRegionModal: () => setIsRegionModalOpen(true),
            onOpenViewModal: () => setIsChartViewModalOpen(true),
            onPlaybackRestoreApplied: handlePlaybackRestoreApplied,
            onPlaybackStateChange: handlePlaybackStateChange,
            onPreviousVideo: handlePlayPreviousVideoWithPreview,
            onToggleCinematicMode: () => void handleToggleCinematicMode(),
            onToggleFavoriteStreamer: () => void handleToggleFavoriteStreamer(),
            playbackRestore: pendingPlaybackRestore,
            playerRef: videoPlayerRef,
            playerSectionRef,
            playerStageRef,
            playerViewportRef,
            selectedCategoryLabel: selectedChartViewOption.label,
            selectedCountryName,
            selectedVideoChannelTitle: resolvedSelectedVideo?.snippet.channelTitle,
            selectedVideoId,
            selectedVideoRankLabel,
            selectedVideoStatLabel,
            selectedVideoTitle: resolvedSelectedVideo?.snippet.title,
            stageActionContent: gameActionContent,
            stageMetadataContent,
            supplementalContent: portfolioContent,
            toggleFavoriteStreamerPending: toggleFavoriteStreamerMutation.isPending,
          }}
          stickySelectedVideoLabel="Now Playing"
          stickySelectedVideoContent={({
            isMobilePlayerStageStickyEnabled,
            desktopPlayerDockSlotRef,
            isDesktopPlayerDockEnabled,
            onJumpToTop,
            onScrollToTop,
            onToggleMobilePlayerStageStickyEnabled,
            onToggleCollapse,
          }) =>
            renderSelectedVideoActionsContent(
              <StickySelectedVideoControls
                isMobileLayout={isMobileLayout}
                isMobilePlayerStageStickyEnabled={isMobileLayout ? isMobilePlayerStageStickyEnabled : undefined}
                isPlaybackPaused={isPlaybackPaused}
                onCollapsePanel={!isMobileLayout ? onToggleCollapse : undefined}
                onJumpToTop={isMobileLayout ? onJumpToTop : undefined}
                onNextVideo={handlePlayNextVideoWithPreview}
                onPauseVideo={handlePauseCurrentVideo}
                onPreviousVideo={handlePlayPreviousVideoWithPreview}
                onResumeVideo={handleResumeCurrentVideo}
                onScrollToTop={!isMobileLayout ? onScrollToTop : undefined}
                onToggleMobilePlayerStageStickyEnabled={
                  isMobileLayout ? onToggleMobilePlayerStageStickyEnabled : undefined
                }
              />,
              isMobileLayout ? onToggleCollapse : onToggleCollapse,
              handleOpenSelectedVideoRankHistory,
              {
                desktopPlayerDockSlotRef: isDesktopPlayerDockEnabled ? desktopPlayerDockSlotRef : undefined,
                isDesktopMiniPlayerEnabled: false,
              },
            )
          }
        />
      </main>
      <GameRankHistoryModal
        error={
          selectedPositionRankHistoryError instanceof Error
            ? selectedPositionRankHistoryError
            : relatedPositionRankHistoryError instanceof Error
              ? relatedPositionRankHistoryError
            : selectedVideoRankHistoryError instanceof Error
              ? selectedVideoRankHistoryError
              : null
        }
        history={mergedRankHistory}
        isLoading={isPositionRankHistoryLoading || isRelatedPositionRankHistoryLoading || isVideoRankHistoryLoading}
        isOpen={isRankHistoryModalOpen}
        onClose={closeRankHistoryModal}
        position={selectedRankHistoryPosition}
        videoFallback={
          resolvedSelectedVideo
            ? {
                channelTitle: resolvedSelectedVideo.snippet.channelTitle,
                currentRank: selectedVideoMarketEntry?.currentRank ?? null,
                chartOut: false,
                thumbnailUrl: getVideoThumbnailUrl(resolvedSelectedVideo),
                title: resolvedSelectedVideo.snippet.title,
              }
            : null
        }
      />
      <RegionFilterModal
        isOpen={isRegionModalOpen}
        onChangeRegion={(regionCode) => handleSelectRegion(regionCode as RegionCode)}
        onClose={() => setIsRegionModalOpen(false)}
        regionOptions={regionOptions}
        selectedRegionCode={selectedRegionCode}
      />
      <ChartViewModal
        isOpen={isChartViewModalOpen}
        onClose={() => setIsChartViewModalOpen(false)}
        onSelectView={handleSelectChartViewFromModal}
        selectedViewId={effectiveChartView}
        viewOptions={chartViewOptions}
      />
      <GameCoinModal
        isOpen={isCoinModalOpen}
        onClose={closeCoinModal}
        overview={liveGameCoinOverview}
        tierProgress={gameCoinTierProgress}
      />
      <GameTradeModal
        confirmLabel={`${formatGameOrderQuantity(normalizedBuyQuantity)} 매수`}
        currentRankLabel={formatRank(selectedVideoCurrentChartRank, { chartOut: selectedVideoIsChartOut })}
        helperText={buyModalHelperText}
        isOpen={isBuyTradeModalOpen}
        isSubmitting={isBuySubmitting}
        maxQuantity={maxBuyQuantity}
        mode="buy"
        onChangeQuantity={(quantity) => {
          const normalizedMaxBuyQuantity = normalizeGameOrderCapacity(maxBuyQuantity);

          if (normalizedMaxBuyQuantity > 0 && quantity <= 0) {
            setBuyQuantity(normalizedMaxBuyQuantity);
            return;
          }

          setBuyQuantity(
            normalizedMaxBuyQuantity > 0
              ? Math.min(normalizeGameOrderQuantity(quantity), normalizedMaxBuyQuantity)
              : normalizeGameOrderQuantity(quantity),
          );
        }}
        onClose={closeTradeModal}
        onConfirm={() => void handleBuyCurrentVideo()}
        quantity={normalizedBuyQuantity}
        summaryItems={[
          { label: '수량', value: formatGameOrderQuantity(normalizedBuyQuantity) },
          { label: '1개당 가격', value: formatPoints(selectedVideoUnitPricePoints ?? 0) },
          { label: '총 매수', value: formatPoints(totalSelectedVideoBuyPoints ?? (selectedVideoUnitPricePoints ?? 0)) },
          ...(selectedVideoBuyCoinSummary
            ? [
                {
                  label: '매수 후 총 평가',
                  value: formatPoints(selectedVideoBuyCoinSummary.nextEvaluationPoints),
                },
                {
                  label: '코인 채굴량',
                  value:
                    typeof selectedVideoBuyCoinSummary.estimatedCoinYield === 'number'
                      ? formatCoins(selectedVideoBuyCoinSummary.estimatedCoinYield)
                      : `Top ${liveGameCoinOverview?.eligibleRankCutoff ?? 0} 진입 시 반영`,
                },
              ]
            : []),
        ]}
        summaryNote={undefined}
        thumbnailUrl={selectedVideoTradeThumbnailUrl}
        title={selectedGameActionTitle}
        unitPointsLabel={formatPoints(selectedVideoUnitPricePoints ?? 0)}
      />
      <GameTradeModal
        confirmLabel={`${formatGameOrderQuantity(normalizedSellQuantity)} 매도`}
        currentRankLabel={formatRank(selectedVideoCurrentChartRank, { chartOut: selectedVideoIsChartOut })}
        helperText={sellModalHelperText}
        isOpen={isSellTradeModalOpen}
        isSubmitting={isSellSubmitting}
        maxQuantity={maxSellQuantity}
        mode="sell"
        onChangeQuantity={(quantity) => {
          const normalizedMaxSellQuantity = normalizeGameOrderCapacity(maxSellQuantity);

          if (normalizedMaxSellQuantity > 0 && quantity <= 0) {
            setSellQuantity(normalizedMaxSellQuantity);
            return;
          }

          setSellQuantity(
            normalizedMaxSellQuantity > 0
              ? Math.min(normalizeGameOrderQuantity(quantity), normalizedMaxSellQuantity)
              : normalizeGameOrderQuantity(quantity),
          );
        }}
        onClose={closeTradeModal}
        onConfirm={() => void handleSellCurrentVideo()}
        quantity={normalizedSellQuantity}
        summaryItems={[
          { label: '수량', value: formatGameOrderQuantity(normalizedSellQuantity) },
          { label: '정산 금액', value: formatPoints(selectedVideoSellSummary.settledPoints) },
          { label: '매도 금액', value: formatPoints(selectedVideoSellSummary.grossSellPoints) },
          { label: '수수료', value: formatPoints(selectedVideoSellSummary.feePoints) },
          {
            label: '손익',
            tone: getPointTone(selectedVideoSellSummary.pnlPoints),
            value: formatPoints(selectedVideoSellSummary.pnlPoints),
          },
        ]}
        summaryNote={`정산 금액은 매도 금액 기준 ${SELL_FEE_RATE_LABEL} 수수료를 반영한 값입니다.`}
        thumbnailUrl={selectedVideoTradeThumbnailUrl}
        title={selectedGameActionTitle}
        unitPointsLabel={formatPoints(selectedVideoUnitPricePoints ?? selectedVideoSellSummary.settledPoints ?? 0)}
      />
      {buyableVideoSearchOverlay && buyableVideoSearchOverlayContainer
        ? createPortal(buyableVideoSearchOverlay, buyableVideoSearchOverlayContainer)
        : null}
    </div>
  );
}

export default HomePage;
