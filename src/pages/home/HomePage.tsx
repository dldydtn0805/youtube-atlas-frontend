import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import type { VideoPlayerHandle } from '../../components/VideoPlayer/VideoPlayer';
import AchievementTitleToast from './sections/AchievementTitleToast';
import GameActionToast from './sections/GameActionToast';
import AppHeader from './sections/AppHeader';
import { GameSelectedVideoPriceSummary, SelectedVideoGameActionsBundle } from './sections/GameActionContent';
import GameTierModal, { type TierModalTab } from './sections/GameTierModal';
import GameHighlightsTab from './sections/GameHighlightsTab';
import GamePanelModal from './sections/GamePanelModal';
import ChartViewModal from './sections/ChartViewModal';
import { RegionFilterModal } from './sections/FilterPanels';
import GamePanelSection from './sections/GamePanelSection';
import GameRankHistoryModal from './sections/GameRankHistoryModal';
import GameSellPreviewDetail from './sections/GameSellPreviewDetail';
import GameTradeModal from './sections/GameTradeModal';
import GameIntroModal from './sections/GameIntroModal';
import GameNotificationModal from './sections/GameNotificationModal';
import GameNotificationToast from './sections/GameNotificationToast';
import GameWalletModal from './sections/GameWalletModal';
import HomePlaybackSection from './sections/HomePlaybackSection';
import { RankingGameLeaderboardTab } from './sections/RankingGamePanel';
import StickySelectedVideoControls from './sections/StickySelectedVideoControls';
import TrendTicker from './sections/TrendTicker';
import {
  DEFAULT_GAME_QUANTITY,
  buildOpenGameHoldings,
  formatGameOrderQuantity,
  formatPoints,
  formatRank,
  getGamePositionQuantity,
  getPointTone,
  normalizeGameOrderCapacity,
  SELL_FEE_RATE_LABEL,
  summarizeGamePositions,
} from './gameHelpers';
import useAppPreferences from './hooks/useAppPreferences';
import useHomeChartCollections from './hooks/useHomeChartCollections';
import useHomeChartViewState from './hooks/useHomeChartViewState';
import useHomeGameUiState from './hooks/useHomeGameUiState';
import useHomePlaybackState from './hooks/useHomePlaybackState';
import useHomeGameNotifications from './hooks/useHomeGameNotifications';
import useHomeRankHistory from './hooks/useHomeRankHistory';
import useHomeTradeFlow from './hooks/useHomeTradeFlow';
import useLogoutOnUnauthorized from './hooks/useLogoutOnUnauthorized';
import useSelectedVideoGameState from './hooks/useSelectedVideoGameState';
import { openGameModal as openGameModalAction } from './homeGameModalActions';
import {
  DEFAULT_CATEGORY_ID,
  GAME_HIGHLIGHTS_QUEUE_ID,
  GAME_LEADERBOARD_HIGHLIGHTS_QUEUE_ID,
  GAME_PORTFOLIO_QUEUE_ID,
  HISTORY_PLAYBACK_QUEUE_ID,
  RESTORED_PLAYBACK_QUEUE_ID,
  SCHEDULED_SELL_ORDERS_QUEUE_ID,
  findPlaybackQueueIdForVideo,
  getFullscreenElement,
  getAdjacentGameScheduledSellOrder,
  getAdjacentGamePosition,
  getVideoThumbnailUrl,
  mapGameHighlightToVideoItem,
  mapGameScheduledSellOrderToVideoItem,
  mapGamePositionToVideoItem,
  resolvePlaybackCategoryLabel,
  sortedCountryCodes,
  type RegionCode,
} from './utils';
import type { ChartSortMode, ChartViewMode } from './types';
import {
  ALL_VIDEO_CATEGORY_ID,
  sortVideoCategories,
  supportsVideoTrendSignals,
  VIDEO_GAME_REGION_CODE,
} from '../../constants/videoCategories';
import { useAuth } from '../../features/auth/useAuth';
import {
  gameQueryKeys,
  useAchievementTitles,
  useBuyableMarketChart,
  useBuyGamePosition,
  useCancelScheduledSellOrder,
  useCreateScheduledSellOrder,
  useCurrentGameSeason,
  useGameTierProgress,
  useGameHighlights,
  useGameLeaderboard,
  useGameLeaderboardHighlights,
  useGameMarket,
  useMyGamePositions,
  useScheduledSellOrders,
  useSellGamePositions,
  useUpdateSelectedAchievementTitle,
} from '../../features/game/queries';
import { getGameInventorySlotLimit } from '../../features/game/inventory';
import { useGameRealtimeInvalidation } from '../../features/game/realtime';
import type { GameHighlight, GamePosition, GameScheduledSellOrder } from '../../features/game/types';
import {
  useFavoriteStreamerVideos,
  useFavoriteStreamers,
  useToggleFavoriteStreamer,
} from '../../features/favorites/queries';
import { fetchVideoById } from '../../features/youtube/api';
import { useMusicTopVideos, usePopularVideosByCategory, useVideoCategories } from '../../features/youtube/queries';
import type { YouTubeVideoItem } from '../../features/youtube/types';
import { ApiRequestError, isApiConfigured } from '../../lib/api';
import '../../styles/app.css';

const COLLAPSED_HOME_SECTIONS_STORAGE_KEY = 'youtube-atlas-collapsed-home-sections';
const GAME_INTRO_MODAL_DISMISSED_STORAGE_KEY = 'youtube-atlas-game-intro-dismissed';
const RANKING_GAME_SECTION_ID = 'ranking-game';
const FULL_CHART_PREFETCH_SORT_MODES = new Set<ChartSortMode>([
  'popular-asc',
  'views-desc',
  'views-asc',
  'rank-up',
  'rank-down',
]);

function formatHighlightScore(score: number) {
  return formatPoints(score).replace(/P$/, '점');
}
const MAX_CHART_ITEM_COUNT = 200;
const MAX_SORT_PREFETCH_PAGE_COUNT = 10;
const CHART_SORT_OPTIONS: Array<{ id: ChartSortMode; label: string }> = [
  { id: 'popular-desc', label: '높은 순위 순' },
  { id: 'rank-up', label: '랭킹 상승 순' },
  { id: 'views-desc', label: '조회수 높은 순' },
  { id: 'popular-asc', label: '낮은 순위 순' },
  { id: 'rank-down', label: '랭킹 하락 순' },
  { id: 'views-asc', label: '조회수 낮은 순' },
];

function hasNextPageFromFetchResult(result: unknown) {
  if (!result || typeof result !== 'object' || !('data' in result)) {
    return false;
  }

  const data = (result as { data?: unknown }).data;

  if (!data || typeof data !== 'object' || !('pages' in data)) {
    return false;
  }

  const pages = (data as { pages?: unknown }).pages;

  if (!Array.isArray(pages) || pages.length === 0) {
    return false;
  }

  const lastPage = pages[pages.length - 1];

  return (
    Boolean(lastPage) &&
    typeof lastPage === 'object' &&
    'nextPageToken' in lastPage &&
    typeof (lastPage as { nextPageToken?: unknown }).nextPageToken === 'string'
  );
}

function getLoadedItemCountFromFetchResult(result: unknown) {
  if (!result || typeof result !== 'object' || !('data' in result)) {
    return 0;
  }

  const data = (result as { data?: unknown }).data;

  if (!data || typeof data !== 'object' || !('pages' in data)) {
    return 0;
  }

  const pages = (data as { pages?: unknown }).pages;

  if (!Array.isArray(pages)) {
    return 0;
  }

  return pages.reduce((totalCount, page) => {
    if (!page || typeof page !== 'object' || !('items' in page)) {
      return totalCount;
    }

    const items = (page as { items?: unknown }).items;

    return totalCount + (Array.isArray(items) ? items.length : 0);
  }, 0);
}

function formatSortPrefetchStatus(label: string, loadedItemCount: number, initialItemCount: number) {
  const boundedLoadedItemCount = Math.min(loadedItemCount, MAX_CHART_ITEM_COUNT);
  const additionalItemCount = Math.max(0, boundedLoadedItemCount - initialItemCount);

  return `${label} 전체 종목 확인 중 · 현재 ${boundedLoadedItemCount}/${MAX_CHART_ITEM_COUNT}개, 추가 ${additionalItemCount}개 처리 완료`;
}

async function fetchRemainingChartPages(
  fetchNextPage: () => Promise<unknown>,
  hasInitialNextPage: boolean,
  onProgress?: (loadedItemCount: number) => void,
) {
  if (!hasInitialNextPage) {
    return;
  }

  let hasNextPage: boolean = hasInitialNextPage;

  for (let pageCount = 0; hasNextPage && pageCount < MAX_SORT_PREFETCH_PAGE_COUNT; pageCount += 1) {
    const result = await fetchNextPage();

    onProgress?.(getLoadedItemCountFromFetchResult(result));
    hasNextPage = hasNextPageFromFetchResult(result);
  }
}

function getInitialGameIntroModalOpen() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(GAME_INTRO_MODAL_DISMISSED_STORAGE_KEY) !== 'true';
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

function HomePage() {
  const queryClient = useQueryClient();
  const { accessToken, applyCurrentUser, isLoggingOut, logout, refreshCurrentUser, status: authStatus, user } = useAuth();
  const [selectedOpenPositionId, setSelectedOpenPositionId] = useState<number | null>(null);
  const [selectedScheduledSellOrderId, setSelectedScheduledSellOrderId] = useState<number | null>(null);
  const [activeGameTab, setActiveGameTab] = useState<'positions' | 'scheduledOrders' | 'history' | 'guide'>('positions');
  const [isBuyableOnlyFilterActive, setIsBuyableOnlyFilterActive] = useState(false);
  const [collapsedHomeSectionIds, setCollapsedHomeSectionIds] = useState(getInitialCollapsedHomeSectionIds);
  const [selectedLeaderboardUserId, setSelectedLeaderboardUserId] = useState<number | null>(null);
  const [historyPlaybackVideo, setHistoryPlaybackVideo] = useState<YouTubeVideoItem | null>(null);
  const [historyPlaybackLoadingVideoId, setHistoryPlaybackLoadingVideoId] = useState<string | null>(null);
  const [tradeTargetVideoId, setTradeTargetVideoId] = useState<string | null>(null);
  const [tradeTargetPositionId, setTradeTargetPositionId] = useState<number | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [tierModalDefaultTab, setTierModalDefaultTab] = useState<TierModalTab>('tier');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isGameIntroModalOpen, setIsGameIntroModalOpen] = useState(getInitialGameIntroModalOpen);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isChartViewModalOpen, setIsChartViewModalOpen] = useState(false);
  const [pendingRegionTopVideoSelection, setPendingRegionTopVideoSelection] = useState<string | null>(null);
  const [isPlaybackPaused, setIsPlaybackPaused] = useState(false);
  const [selectedChartView, setSelectedChartView] = useState<ChartViewMode>('popular');
  const [chartSortMode, setChartSortMode] = useState<ChartSortMode>('popular-desc');
  const [sortPrefetchStatus, setSortPrefetchStatus] = useState<string | null>(null);
  const openChartViewModal = useCallback(() => setIsChartViewModalOpen(true), []);
  const closeChartViewModal = useCallback(() => setIsChartViewModalOpen(false), []);
  const chartSortOptions = CHART_SORT_OPTIONS;
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

  const [achievementTitleToastMessage, setAchievementTitleToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!achievementTitleToastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setAchievementTitleToastMessage(null);
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [achievementTitleToastMessage]);

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
            behavior: 'auto',
            top: 0,
          });
        } else {
          fullscreenElement.scrollTop = 0;
        }
      }

      window.scrollTo({
        behavior: 'auto',
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
    data: buyableMarketChartData,
    error: buyableMarketChartError,
    fetchNextPage: fetchNextBuyableMarketChartPage,
    hasNextPage: hasNextBuyableMarketChartPage = false,
    isFetchingNextPage: isFetchingNextBuyableMarketChartPage,
    isLoading: isBuyableMarketChartLoading,
    isError: isBuyableMarketChartError,
  } = useBuyableMarketChart(accessToken, selectedRegionCode, shouldLoadGame);
  const {
    data: gameTierProgress,
    error: gameTierProgressError,
    isLoading: isGameTierProgressLoading,
  } = useGameTierProgress(accessToken, selectedRegionCode, shouldLoadGame);

  const {
    data: gameLeaderboard = [],
    error: gameLeaderboardError,
    isError: isGameLeaderboardError,
    isLoading: isGameLeaderboardLoading,
  } = useGameLeaderboard(accessToken, selectedRegionCode, shouldLoadGame);
  const {
    data: achievementTitleCollection,
  } = useAchievementTitles(accessToken, shouldLoadGame);
  const updateSelectedAchievementTitleMutation = useUpdateSelectedAchievementTitle(accessToken, selectedRegionCode);
  const {
    data: openGamePositions = [],
    error: openGamePositionsError,
    isLoading: isOpenGamePositionsLoading,
    refetch: refetchOpenGamePositions,
  } = useMyGamePositions(accessToken, selectedRegionCode, 'OPEN', shouldLoadGame);
  const {
    data: scheduledSellOrders = [],
    error: scheduledSellOrdersError,
    isLoading: isScheduledSellOrdersLoading,
    refetch: refetchScheduledSellOrders,
  } = useScheduledSellOrders(accessToken, selectedRegionCode, shouldLoadGame);
  const {
    data: selectedLeaderboardHighlights = [],
    error: selectedLeaderboardHighlightsError,
    isError: isSelectedLeaderboardHighlightsError,
    isLoading: isSelectedLeaderboardHighlightsLoading,
  } = useGameLeaderboardHighlights(
    accessToken,
    selectedLeaderboardUserId,
    selectedRegionCode,
    shouldLoadGame && selectedLeaderboardUserId !== null,
  );
  const {
    data: allGameHistoryPositions = [],
    error: gameHistoryPositionsError,
    isLoading: isGameHistoryLoading,
    refetch: refetchGameHistoryPositions,
  } = useMyGamePositions(accessToken, selectedRegionCode, '', shouldLoadGame, 30);
  const gameHistoryPositions = useMemo(
    () =>
      allGameHistoryPositions
        .filter((position) => position.status !== 'OPEN')
        .slice()
        .sort((left, right) => {
          const leftTime = new Date(left.closedAt ?? left.createdAt).getTime();
          const rightTime = new Date(right.closedAt ?? right.createdAt).getTime();

          if (leftTime !== rightTime) {
            return rightTime - leftTime;
          }

          return right.id - left.id;
        }),
    [allGameHistoryPositions],
  );
  const {
    data: gameHighlights = [],
    error: gameHighlightsError,
    isLoading: isGameHighlightsLoading,
  } = useGameHighlights(accessToken, selectedRegionCode, shouldLoadGame);
  const {
    clearGameNotifications,
    deleteGameNotification,
    dismissModalGameNotification,
    dismissVisibleGameNotification,
    gameNotifications,
    hasUnreadGameNotifications,
    isGameNotificationsFetching,
    modalGameNotification,
    removeModalGameNotification,
    refreshGameNotifications,
    visibleGameNotification,
  } = useHomeGameNotifications({
    accessToken,
    queryClient,
    resetKey: user?.id ?? null,
    seasonNotifications: currentGameSeason?.notifications,
    selectedRegionCode,
    shouldLoadGame,
  });

  const {
    evaluationPoints: openPositionsEvaluationPoints,
    profitPoints: openPositionsProfitPoints,
    stakePoints: openPositionsBuyPoints,
  } = useMemo(() => summarizeGamePositions(openGamePositions), [openGamePositions]);
  const computedWalletTotalAssetPoints = currentGameSeason
    ? currentGameSeason.wallet.balancePoints + openPositionsEvaluationPoints
    : null;
  const buyGamePositionMutation = useBuyGamePosition(accessToken);
  const sellGamePositionsMutation = useSellGamePositions(accessToken);
  const createScheduledSellOrderMutation = useCreateScheduledSellOrder(accessToken);
  const cancelScheduledSellOrderMutation = useCancelScheduledSellOrder(accessToken, selectedRegionCode);

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
  const isAllCategorySelected = selectedCategory?.id === ALL_VIDEO_CATEGORY_ID;
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
  const {
    buyableChartEmptyMessage,
    buyableVideoSearchStatus,
    canShowGameActions,
    chartTrendSignalsByVideoId,
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
    isBuyableOnlyFilterAvailable,
    isBuyableVideoSearchLoading,
    isOpenPositionLimitReached,
    isRealtimeSurgingError,
    isRealtimeSurgingLoading,
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
    topRankRisersSection,
    topRankRisersSignals,
    isNewChartEntriesError,
    isNewChartEntriesLoading,
  } = useHomeChartCollections({
    authStatus,
    buyableMarketChartPages: buyableMarketChartData?.pages,
    chartSortMode,
    currentGameSeason,
    favoriteStreamerVideosError,
    favoriteStreamerVideosPages: favoriteStreamerVideosData?.pages,
    favoriteStreamersCount: favoriteStreamers.length,
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
    musicChartPages: musicChartData?.pages,
    openGamePositions,
    selectedCategory,
    selectedRegionCode,
    selectedSectionPages: data?.pages,
    shouldLoadFavorites,
  });
  const gameHighlightsPlaybackSection = useMemo(
    () =>
      gameHighlights.length > 0
        ? {
            categoryId: GAME_HIGHLIGHTS_QUEUE_ID,
            description: '내 하이라이트에서 다시 연 영상을 이어서 볼 수 있습니다.',
            items: gameHighlights.map((highlight) =>
              mapGameHighlightToVideoItem(highlight, GAME_HIGHLIGHTS_QUEUE_ID),
            ),
            label: '하이라이트',
          }
        : undefined,
    [gameHighlights],
  );
  const leaderboardHighlightsPlaybackSection = useMemo(
    () =>
      selectedLeaderboardHighlights.length > 0
        ? {
            categoryId: GAME_LEADERBOARD_HIGHLIGHTS_QUEUE_ID,
            description: '리더보드 하이라이트에서 다시 연 영상을 이어서 볼 수 있습니다.',
            items: selectedLeaderboardHighlights.map((highlight) =>
              mapGameHighlightToVideoItem(highlight, GAME_LEADERBOARD_HIGHLIGHTS_QUEUE_ID),
            ),
            label: '랭킹 하이라이트',
          }
        : undefined,
    [selectedLeaderboardHighlights],
  );
  const scheduledSellOrdersPlaybackSection = useMemo(
    () =>
      scheduledSellOrders.length > 0
        ? {
            categoryId: SCHEDULED_SELL_ORDERS_QUEUE_ID,
            description: '예약 매도 대기열에서 다시 연 영상을 이어서 볼 수 있습니다.',
            items: scheduledSellOrders.map(mapGameScheduledSellOrderToVideoItem),
            label: '대기열',
          }
        : undefined,
    [scheduledSellOrders],
  );
  const playbackExtraSections = useMemo(
    () => [
      ...(extraPlaybackSections ?? []),
      ...(gameHighlightsPlaybackSection ? [gameHighlightsPlaybackSection] : []),
      ...(leaderboardHighlightsPlaybackSection ? [leaderboardHighlightsPlaybackSection] : []),
      ...(scheduledSellOrdersPlaybackSection ? [scheduledSellOrdersPlaybackSection] : []),
    ],
    [
      extraPlaybackSections,
      gameHighlightsPlaybackSection,
      leaderboardHighlightsPlaybackSection,
      scheduledSellOrdersPlaybackSection,
    ],
  );
  const {
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
    buyableChartEmptyMessage,
    buyableChartSection: sortedBuyableMarketChartSection,
    buyableFavoriteChartSection: sortedBuyableFavoriteChartSection,
    chartErrorMessage,
    chartTrendSignalsByVideoId,
    displaySelectedPlaybackSection,
    favoriteStreamerVideoErrorMessage,
    favoriteStreamersCount: favoriteStreamers.length,
    favoriteTrendSignalsByVideoId,
    fetchNextBuyableChartPage: fetchNextBuyableMarketChartPage,
    fetchNextFavoriteStreamerVideosPage,
    fetchNextPage,
    featuredChartSections: sortedFeaturedChartSections,
    hasNextBuyableChartPage: hasNextBuyableMarketChartPage,
    hasNextFavoriteStreamerVideosPage,
    hasNextPage,
    hasResolvedChartTrendSignals,
    hasResolvedFavoriteTrendSignals,
    isBuyableChartError: isBuyableMarketChartError,
    isBuyableChartLoading: isBuyableMarketChartLoading,
    isChartError,
    isChartLoading,
    isFavoriteStreamerVideosError,
    isFavoriteStreamerVideosLoading,
    isFavoriteStreamersError,
    isFavoriteStreamersLoading,
    isFetchingNextBuyableChartPage: isFetchingNextBuyableMarketChartPage,
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
    musicChartSection: sortedFilteredMusicChartSection,
    musicTrendSignalsByVideoId,
    onLoadMoreMusicChart: fetchNextMusicChartPage,
    selectedChartView,
    setCollapsedHomeSectionIds,
    setSelectedChartView,
  });
  const handleChangeChartSortMode = useCallback(
    (sortMode: ChartSortMode) => {
      setChartSortMode(sortMode);

      if (!FULL_CHART_PREFETCH_SORT_MODES.has(sortMode)) {
        return;
      }

      if (effectiveChartView === 'buyable') {
        if (hasNextBuyableMarketChartPage && !isFetchingNextBuyableMarketChartPage) {
          const initialItemCount = Math.min(sortedBuyableMarketChartSection?.items.length ?? 0, MAX_CHART_ITEM_COUNT);

          setSortPrefetchStatus(
            `매수 가능 전체 종목 확인 중 · 현재 ${initialItemCount}/${MAX_CHART_ITEM_COUNT}개, 추가 종목 작업 중`,
          );

          void fetchRemainingChartPages(
            fetchNextBuyableMarketChartPage,
            hasNextBuyableMarketChartPage,
            (loadedItemCount) => {
              setSortPrefetchStatus(formatSortPrefetchStatus('매수 가능', loadedItemCount, initialItemCount));
            },
          )
            .catch(() => undefined)
            .finally(() => {
              setSortPrefetchStatus(null);
            });
        }

        return;
      }

      if (effectiveChartView === 'popular' && hasNextPage && !isFetchingNextPage) {
        const initialItemCount = Math.min(selectedPlaybackSection?.items.length ?? 0, MAX_CHART_ITEM_COUNT);

        setSortPrefetchStatus(
          `TOP 200 전체 종목 확인 중 · 현재 ${initialItemCount}/${MAX_CHART_ITEM_COUNT}개, 추가 종목 작업 중`,
        );

        void fetchRemainingChartPages(fetchNextPage, hasNextPage, (loadedItemCount) => {
          setSortPrefetchStatus(formatSortPrefetchStatus('TOP 200', loadedItemCount, initialItemCount));
        })
          .catch(() => undefined)
          .finally(() => {
            setSortPrefetchStatus(null);
          });
      }
    },
    [
      effectiveChartView,
      fetchNextBuyableMarketChartPage,
      fetchNextPage,
      sortedBuyableMarketChartSection?.items.length,
      hasNextBuyableMarketChartPage,
      hasNextPage,
      isFetchingNextBuyableMarketChartPage,
      isFetchingNextPage,
      selectedPlaybackSection?.items.length,
    ],
  );
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
    extraPlaybackSections: playbackExtraSections,
    favoriteStreamerVideoSection,
    gamePortfolioSection,
    historyPlaybackSection,
    newChartEntriesSection: sortedNewChartEntriesSection,
    isMobileLayout,
    logout,
    realtimeSurgingSection: sortedRealtimeSurgingSection,
    preferredInitialPlaybackSection:
      authStatus === 'authenticated' ? sortedBuyableMarketChartSection : undefined,
    preferredInitialPlaybackSectionLoading:
      authStatus === 'authenticated' && isBuyableMarketChartLoading,
    preferredInitialPlaybackFallbackSection:
      authStatus === 'authenticated' ? gamePortfolioSection : undefined,
    preferredInitialPlaybackFallbackSectionLoading:
      authStatus === 'authenticated' && isOpenGamePositionsLoading,
    preferredInitialPlaybackSectionSelectionKey:
      authStatus === 'authenticated' ? `login:${user?.id ?? accessToken ?? 'session'}` : null,
    scrollToPlayerTop: scrollToPlayerStage,
    selectedCategoryId,
    selectedPlaybackSection,
    setSelectedCategoryId,
    sortedVideoCategories,
    user,
    videoPlayerRef,
  });
  const selectedPlaybackCategoryLabel = useMemo(
    () =>
      resolvePlaybackCategoryLabel({
        activePlaybackQueueId,
        extraPlaybackSections: playbackExtraSections,
        fallbackLabel: selectedChartViewOption.label,
        favoriteStreamerVideoSection,
        newChartEntriesSection: sortedNewChartEntriesSection,
        realtimeSurgingSection: sortedRealtimeSurgingSection,
        selectedPlaybackSection: labeledSelectedPlaybackSection,
        selectedVideoId,
      }),
    [
      activePlaybackQueueId,
      playbackExtraSections,
      favoriteStreamerVideoSection,
      labeledSelectedPlaybackSection,
      sortedNewChartEntriesSection,
      sortedRealtimeSurgingSection,
      selectedChartViewOption.label,
      selectedVideoId,
    ],
  );
  const {
    activeTradeModal,
    buyQuantity,
    closeTierModal,
    closeRankHistoryModal,
    closeTradeModal,
    gameActionStatus,
    getRemainingHoldSeconds,
    isTierModalOpen,
    openTierModal,
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

  useEffect(() => {
    if (activeTradeModal !== null) {
      return;
    }

    setTradeTargetVideoId(null);
    setTradeTargetPositionId(null);
  }, [activeTradeModal]);

  useEffect(() => {
    if (!gameActionStatus) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setGameActionStatus(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [gameActionStatus, setGameActionStatus]);

  const isRankingGameCollapsed = collapsedHomeSectionIds.includes(RANKING_GAME_SECTION_ID);
  const collapsedFeaturedSectionIds = collapsedHomeSectionIds;
  const toggleCollapsedSection = useCallback((sectionId: string) => {
    setCollapsedHomeSectionIds((currentSectionIds) =>
      currentSectionIds.includes(sectionId)
        ? currentSectionIds.filter((currentSectionId) => currentSectionId !== sectionId)
        : [...currentSectionIds, sectionId],
    );
  }, []);

  useLogoutOnUnauthorized(favoriteStreamersError, logout);
  useLogoutOnUnauthorized(favoriteStreamerVideosError, logout);
  useLogoutOnUnauthorized(currentGameSeasonError, logout);
  useLogoutOnUnauthorized(gameLeaderboardError, logout);
  useLogoutOnUnauthorized(gameTierProgressError, logout);
  useLogoutOnUnauthorized(gameMarketError, logout);
  useLogoutOnUnauthorized(buyableMarketChartError, logout);
  useLogoutOnUnauthorized(openGamePositionsError, logout);
  useLogoutOnUnauthorized(scheduledSellOrdersError, logout);
  useLogoutOnUnauthorized(gameHistoryPositionsError, logout);
  useLogoutOnUnauthorized(gameHighlightsError, logout);
  useLogoutOnUnauthorized(selectedLeaderboardHighlightsError, logout);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      return;
    }

    setSelectedOpenPositionId(null);
    setSelectedScheduledSellOrderId(null);
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
        : activePlaybackQueueId === SCHEDULED_SELL_ORDERS_QUEUE_ID
          ? scheduledSellOrders.some((order) => order.positionId === selectedOpenPositionId)
        : activePlaybackQueueId === HISTORY_PLAYBACK_QUEUE_ID
          ? gameHistoryPositions.some((position) => position.id === selectedOpenPositionId)
          : openGamePositions.some((position) => position.id === selectedOpenPositionId) ||
            gameHistoryPositions.some((position) => position.id === selectedOpenPositionId);

    if (!hasSelectedPosition) {
      setSelectedOpenPositionId(null);
    }
  }, [activePlaybackQueueId, gameHistoryPositions, openGamePositions, scheduledSellOrders, selectedOpenPositionId]);

  useEffect(() => {
    if (activePlaybackQueueId !== SCHEDULED_SELL_ORDERS_QUEUE_ID) {
      if (selectedScheduledSellOrderId != null) {
        setSelectedScheduledSellOrderId(null);
      }
      return;
    }

    if (selectedScheduledSellOrderId == null) {
      return;
    }

    const selectedOrder = scheduledSellOrders.find((order) => order.id === selectedScheduledSellOrderId);

    if (!selectedOrder || selectedOrder.videoId !== selectedVideoId) {
      setSelectedScheduledSellOrderId(null);
    }
  }, [activePlaybackQueueId, scheduledSellOrders, selectedScheduledSellOrderId, selectedVideoId]);

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

    if (activePlaybackQueueId === SCHEDULED_SELL_ORDERS_QUEUE_ID) {
      const currentScheduledOrder = scheduledSellOrders.find(
        (order) => order.id === selectedScheduledSellOrderId,
      );

      if (currentScheduledOrder?.videoId === selectedVideoId) {
        if (currentScheduledOrder.positionId !== selectedOpenPositionId) {
          setSelectedOpenPositionId(currentScheduledOrder.positionId);
        }
        return;
      }

      const nextScheduledOrder = scheduledSellOrders.find((order) => order.videoId === selectedVideoId);

      if ((nextScheduledOrder?.id ?? null) !== selectedScheduledSellOrderId) {
        setSelectedScheduledSellOrderId(nextScheduledOrder?.id ?? null);
      }

      if ((nextScheduledOrder?.positionId ?? null) !== selectedOpenPositionId) {
        setSelectedOpenPositionId(nextScheduledOrder?.positionId ?? null);
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
    selectedScheduledSellOrderId,
    selectedVideoId,
    scheduledSellOrders,
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

  const openGameHoldings = useMemo(
    () => buildOpenGameHoldings(openGamePositions, getRemainingHoldSeconds),
    [getRemainingHoldSeconds, openGamePositions],
  );
  const gameMarketByVideoId = useMemo(
    () => new Map(gameMarket.map((marketVideo) => [marketVideo.videoId, marketVideo])),
    [gameMarket],
  );
  const tradeTargetVideo = useMemo(() => {
    if (!tradeTargetVideoId) {
      return undefined;
    }

    const sections = [
      activeChartSection,
      ...activeChartFeaturedSections.map(({ section }) => section),
      selectedPlaybackSection,
      favoriteStreamerVideoSection,
      sortedNewChartEntriesSection,
      sortedRealtimeSurgingSection,
      sortedBuyableMarketChartSection,
      sortedFilteredMusicChartSection,
    ];

    for (const section of sections) {
      const video = section?.items.find((item) => item.id === tradeTargetVideoId);

      if (video) {
        return video;
      }
    }

    return undefined;
  }, [
    activeChartFeaturedSections,
    activeChartSection,
    favoriteStreamerVideoSection,
    selectedPlaybackSection,
    sortedBuyableMarketChartSection,
    sortedFilteredMusicChartSection,
    sortedNewChartEntriesSection,
    sortedRealtimeSurgingSection,
    tradeTargetVideoId,
  ]);
  const openGamePositionQuantityByVideoId = useMemo(() => {
    const quantityByVideoId = new Map<string, number>();

    for (const position of openGamePositions) {
      quantityByVideoId.set(
        position.videoId,
        (quantityByVideoId.get(position.videoId) ?? 0) + getGamePositionQuantity(position),
      );
    }

    return quantityByVideoId;
  }, [openGamePositions]);
  const openGameSellableQuantityByVideoId = useMemo(() => {
    const quantityByVideoId = new Map<string, number>();

    for (const holding of openGameHoldings) {
      quantityByVideoId.set(
        holding.videoId,
        (quantityByVideoId.get(holding.videoId) ?? 0) + holding.sellableQuantity,
      );
    }

    return quantityByVideoId;
  }, [openGameHoldings]);
  const remainingOpenPositionSlotsForCards = currentGameSeason
    ? Math.max(0, getGameInventorySlotLimit(currentGameSeason) - openGamePositionQuantityByVideoId.size)
    : 0;
  const getVideoCardTradeActionState = useCallback(
    (item: YouTubeVideoItem) => {
      const marketVideo = gameMarketByVideoId.get(item.id);
      const ownedQuantity = openGamePositionQuantityByVideoId.get(item.id) ?? 0;
      const sellableQuantity = openGameSellableQuantityByVideoId.get(item.id) ?? 0;
      const isAlreadyOwned = ownedQuantity > 0;
      const maxBuyQuantity =
        currentGameSeason && marketVideo?.currentPricePoints
          ? Math.floor((currentGameSeason.wallet.balancePoints * DEFAULT_GAME_QUANTITY) / marketVideo.currentPricePoints)
          : 0;
      const maxOrderBuyQuantity = normalizeGameOrderCapacity(
        isAlreadyOwned || remainingOpenPositionSlotsForCards > 0 ? maxBuyQuantity : 0,
      );
      const canBuy = Boolean(
        canShowGameActions &&
          authStatus === 'authenticated' &&
          currentGameSeason &&
          marketVideo?.canBuy &&
          maxOrderBuyQuantity > 0,
      );
      const canSell = canShowGameActions && authStatus === 'authenticated' && sellableQuantity > 0;
      const buyTitle = !canShowGameActions
        ? '전체 카테고리에서만 매수할 수 있습니다.'
        : authStatus !== 'authenticated'
          ? '로그인 후 매수할 수 있습니다.'
          : marketVideo?.canBuy && maxOrderBuyQuantity > 0
            ? `${formatGameOrderQuantity(Math.min(DEFAULT_GAME_QUANTITY, maxOrderBuyQuantity))}부터 매수할 수 있습니다.`
            : marketVideo?.buyBlockedReason ?? (currentGameSeason ? '현재 영상은 게임 거래 대상이 아닙니다.' : '활성 시즌이 없습니다.');
      const sellTitle = !canShowGameActions
        ? '전체 카테고리에서만 매도할 수 있습니다.'
        : authStatus !== 'authenticated'
          ? '로그인 후 매도할 수 있습니다.'
          : sellableQuantity > 0
            ? `${formatGameOrderQuantity(sellableQuantity)} 즉시 매도할 수 있습니다.`
            : ownedQuantity > 0
              ? '매도 대기 시간이 끝난 수량만 매도할 수 있습니다.'
          : '보유 수량이 있을 때만 매도할 수 있습니다.';

      return {
        buyTitle,
        canBuy,
        canSell,
        sellTitle,
      };
    },
    [
      authStatus,
      canShowGameActions,
      currentGameSeason,
      gameMarketByVideoId,
      openGamePositionQuantityByVideoId,
      openGameSellableQuantityByVideoId,
      remainingOpenPositionSlotsForCards,
    ],
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
  const tradeTargetGameState = useSelectedVideoGameState({
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
    resolvedSelectedVideo: tradeTargetVideo,
    selectedOpenPositionId: tradeTargetPositionId,
    selectedCategoryId,
    selectedCategoryLabel: selectedChartViewOption.label,
    selectedCountryName,
    selectedRegionCode,
    selectedVideoId: tradeTargetVideoId ?? undefined,
    selectedVideoRankSignalById: selectedVideoRankSignalsById,
    sellQuantity,
  });
  const isTradeTargetActive = Boolean(activeTradeModal && tradeTargetVideoId);
  const tradeBuyModalHelperText = isTradeTargetActive ? tradeTargetGameState.buyModalHelperText : buyModalHelperText;
  const tradeGameSeasonRegionMismatch = isTradeTargetActive
    ? tradeTargetGameState.gameSeasonRegionMismatch
    : gameSeasonRegionMismatch;
  const tradeMaxBuyQuantity = isTradeTargetActive ? tradeTargetGameState.maxBuyQuantity : maxBuyQuantity;
  const tradeMaxSellQuantity = isTradeTargetActive ? tradeTargetGameState.maxSellQuantity : maxSellQuantity;
  const tradeNormalizedBuyQuantity = isTradeTargetActive
    ? tradeTargetGameState.normalizedBuyQuantity
    : normalizedBuyQuantity;
  const tradeNormalizedSellQuantity = isTradeTargetActive
    ? tradeTargetGameState.normalizedSellQuantity
    : normalizedSellQuantity;
  const tradeSelectedGameActionTitle = isTradeTargetActive
    ? tradeTargetGameState.selectedGameActionTitle
    : selectedGameActionTitle;
  const tradeSelectedVideoCurrentChartRank = isTradeTargetActive
    ? tradeTargetGameState.selectedVideoCurrentChartRank
    : selectedVideoCurrentChartRank;
  const tradeSelectedVideoId = isTradeTargetActive ? tradeTargetVideoId ?? undefined : selectedVideoId;
  const tradeSelectedVideoIsChartOut = isTradeTargetActive
    ? tradeTargetGameState.selectedVideoIsChartOut
    : selectedVideoIsChartOut;
  const tradeSelectedVideoMarketEntry = isTradeTargetActive
    ? tradeTargetGameState.selectedVideoMarketEntry
    : selectedVideoMarketEntry;
  const tradeSelectedVideoSellSummary = isTradeTargetActive
    ? tradeTargetGameState.selectedVideoSellSummary
    : selectedVideoSellSummary;
  const tradeSelectedVideoTradeThumbnailUrl = isTradeTargetActive
    ? tradeTargetGameState.selectedVideoTradeThumbnailUrl
    : selectedVideoTradeThumbnailUrl;
  const tradeSelectedVideoUnitPricePoints = isTradeTargetActive
    ? tradeTargetGameState.selectedVideoUnitPricePoints
    : selectedVideoUnitPricePoints;
  const tradeSellModalHelperText = isTradeTargetActive ? tradeTargetGameState.sellModalHelperText : sellModalHelperText;
  const tradeTotalSelectedVideoBuyPoints = isTradeTargetActive
    ? tradeTargetGameState.totalSelectedVideoBuyPoints
    : totalSelectedVideoBuyPoints;
  const selectedSellPositionId = useMemo(
    () =>
      selectedOpenPositionId != null &&
        openGamePositions.some((position) => position.id === selectedOpenPositionId)
        ? selectedOpenPositionId
        : null,
    [openGamePositions, selectedOpenPositionId],
  );
  const tradeTargetSellPositionId =
    tradeTargetPositionId != null &&
      openGamePositions.some((position) => position.id === tradeTargetPositionId && position.videoId === tradeTargetVideoId)
      ? tradeTargetPositionId
      : null;
  const tradeSelectedSellPositionId = isTradeTargetActive ? tradeTargetSellPositionId : selectedSellPositionId;
  const canScheduleSellCurrentSelection = tradeSelectedSellPositionId != null;
  const refetchCurrentChartAfterBuy = useCallback(async () => {
    const invalidations: Array<Promise<unknown>> = [];

    if (effectiveChartView === 'favorites' && accessToken) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: ['favoriteStreamerVideos', accessToken, selectedRegionCode],
          refetchType: 'active',
        }),
      );
    } else if (effectiveChartView === 'buyable' && accessToken) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: gameQueryKeys.buyableMarketChart(accessToken, selectedRegionCode),
          refetchType: 'active',
        }),
      );
    } else if (effectiveChartView === 'music') {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: ['musicTopVideos', selectedRegionCode],
          refetchType: 'active',
        }),
      );
    } else if (effectiveChartView === 'realtime-surging') {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: ['realtimeSurging', selectedRegionCode],
          refetchType: 'active',
        }),
      );
    } else if (effectiveChartView === 'new-chart-entries') {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: ['newChartEntries', selectedRegionCode],
          refetchType: 'active',
        }),
      );
    } else {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: ['popularVideosByCategory', selectedRegionCode, selectedCategory?.id],
          refetchType: 'active',
        }),
      );
    }

    await Promise.all(invalidations);
  }, [accessToken, effectiveChartView, queryClient, selectedCategory?.id, selectedRegionCode]);
  const refetchGameTradePanels = useCallback(async () => {
    await Promise.all([
      refetchOpenGamePositions(),
      refetchScheduledSellOrders(),
      refetchGameHistoryPositions(),
    ]);
  }, [refetchGameHistoryPositions, refetchOpenGamePositions, refetchScheduledSellOrders]);
  const handleRefreshGameTab = useCallback(
    async (tab: 'positions' | 'scheduledOrders' | 'history' | 'guide') => {
      if (tab === 'positions') {
        await refetchOpenGamePositions();
        return;
      }

      if (tab === 'scheduledOrders') {
        await refetchScheduledSellOrders();
        return;
      }

      if (tab === 'history') {
        await refetchGameHistoryPositions();
      }
    },
    [refetchGameHistoryPositions, refetchOpenGamePositions, refetchScheduledSellOrders],
  );
  const refetchGameDataAfterBuy = useCallback(async () => {
    await Promise.all([refetchCurrentChartAfterBuy(), refetchGameTradePanels()]);
  }, [refetchCurrentChartAfterBuy, refetchGameTradePanels]);

  const {
    closeTradeModal: closeTradeModalFromFlow,
    displaySellPreview,
    handleBuyCurrentVideo,
    handleBuyQuantityChange,
    handleCreateScheduledSellOrder,
    handleSellCurrentVideo,
    handleSellQuantityChange,
    isBuySubmitting,
    isBuyTradeModalOpen,
    isScheduledSellSubmitting,
    isSellPreviewPending,
    isSellSubmitting,
    isSellTradeModalOpen,
    openBuyTradeModal,
    openSellTradeModal,
    projectedWalletBalanceAfterBuy,
    projectedWalletBalanceAfterSell,
    resolvedSellSummary,
    scheduledSellConditionError,
    scheduledSellTargetRank,
    scheduledSellTriggerDirection,
    sellOrderMode,
    sellTradeUnitPointsLabel,
    setScheduledSellTargetRank,
    setScheduledSellTriggerDirection,
    setSellOrderMode,
  } = useHomeTradeFlow({
    accessToken,
    activeTradeModal,
    authStatus,
    buyQuantity,
    closeTradeModal,
    createScheduledSellOrder: createScheduledSellOrderMutation.mutateAsync,
    currentGameSeason,
    currentGameSeasonError,
    gameSeasonRegionMismatch: tradeGameSeasonRegionMismatch,
    logout,
    maxBuyQuantity: tradeMaxBuyQuantity,
    maxSellQuantity: tradeMaxSellQuantity,
    mutateBuyGamePosition: buyGamePositionMutation.mutateAsync,
    mutateSellGamePositions: sellGamePositionsMutation.mutateAsync,
    normalizedSellQuantity: tradeNormalizedSellQuantity,
    onBuySuccess: refetchGameDataAfterBuy,
    onSellSuccess: refetchGameTradePanels,
    onScheduledSellSuccess: refetchGameTradePanels,
    selectedOpenPositionId: tradeSelectedSellPositionId,
    selectedSellPositionId: tradeSelectedSellPositionId,
    selectedGameActionTitle: tradeSelectedGameActionTitle,
    selectedRegionCode,
    selectedVideoCurrentChartRank: tradeSelectedVideoCurrentChartRank,
    selectedVideoId: tradeSelectedVideoId,
    selectedVideoMarketEntry: tradeSelectedVideoMarketEntry,
    selectedVideoSellSummary: tradeSelectedVideoSellSummary,
    selectedVideoUnitPricePoints: tradeSelectedVideoUnitPricePoints,
    sellQuantity,
    setActiveGameTab,
    setActiveTradeModal,
    setBuyQuantity,
    setGameActionStatus,
    setSellQuantity,
    totalSelectedVideoBuyPoints: tradeTotalSelectedVideoBuyPoints,
  });
  const handleCancelScheduledSellOrder = useCallback(
    async (orderId: number) => {
      try {
        await cancelScheduledSellOrderMutation.mutateAsync(orderId);
        await refetchGameTradePanels();
      } catch (error) {
        if (
          error instanceof ApiRequestError &&
          (error.code === 'unauthorized' || error.code === 'session_expired')
        ) {
          void logout();
          return;
        }

        setGameActionStatus(
          error instanceof Error ? error.message : '예약 매도 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        );
      }
    },
    [cancelScheduledSellOrderMutation, logout, refetchGameTradePanels, setGameActionStatus],
  );

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
  }, [selectedVideoId]);

  const handleSelectVideoWithPreview = useCallback(
    (videoId: string, playbackQueueId: string) => {
      if (!videoId) {
        return;
      }

      const nextPreviewVideoId = videoId;
      handleSelectVideo(nextPreviewVideoId, playbackQueueId);
    },
    [handleSelectVideo],
  );
  const handleOpenVideoCardBuyTradeModal = useCallback(
    (videoId: string) => {
      setTradeTargetVideoId(videoId);
      setTradeTargetPositionId(null);
      setActiveTradeModal('buy');
    },
    [setActiveTradeModal],
  );
  const handleOpenVideoCardSellTradeModal = useCallback(
    (videoId: string) => {
      setTradeTargetVideoId(videoId);
      setTradeTargetPositionId(null);
      setActiveTradeModal('sell');
    },
    [setActiveTradeModal],
  );
  const handleOpenRecentPlayback = useCallback(
    (videoId: string) => {
      if (!videoId) {
        return;
      }

      const playbackQueueId =
        findPlaybackQueueIdForVideo(videoId, {
          extraSections: playbackExtraSections,
          favoriteStreamerVideoSection,
          gamePortfolioSection,
          historyPlaybackSection,
          newChartEntriesSection: sortedNewChartEntriesSection,
          realtimeSurgingSection: sortedRealtimeSurgingSection,
          selectedSection: selectedPlaybackSection,
        }) ?? RESTORED_PLAYBACK_QUEUE_ID;

      handleSelectVideoWithPreview(videoId, playbackQueueId);
    },
    [
      favoriteStreamerVideoSection,
      gamePortfolioSection,
      handleSelectVideoWithPreview,
      historyPlaybackSection,
      playbackExtraSections,
      selectedPlaybackSection,
      sortedNewChartEntriesSection,
      sortedRealtimeSurgingSection,
    ],
  );
  const handleSelectGameHighlightVideo = useCallback(
    (highlight: GameHighlight) => {
      closeTierModal();
      handleSelectVideoWithPreview(highlight.videoId, GAME_HIGHLIGHTS_QUEUE_ID);
    },
    [closeTierModal, handleSelectVideoWithPreview],
  );
  const handleSelectLeaderboardHighlightVideo = useCallback(
    (highlight: GameHighlight) => {
      closeTierModal();
      handleSelectVideoWithPreview(highlight.videoId, GAME_LEADERBOARD_HIGHLIGHTS_QUEUE_ID);
    },
    [closeTierModal, handleSelectVideoWithPreview],
  );
  const headerTrendTicker = useMemo(
    () => {
      if (!isAllCategorySelected || topRankRisersSignals.length === 0 || !topRankRisersSection?.categoryId) {
        return undefined;
      }

      return (
        <TrendTicker
          currentTierCode={gameTierProgress?.currentTier.tierCode}
          isAuthenticated={authStatus === 'authenticated'}
          items={topRankRisersSignals}
          onSelect={(videoId) => {
            handleSelectVideoWithPreview(videoId, topRankRisersSection.categoryId);
          }}
        />
      );
    },
    [
      authStatus,
      handleSelectVideoWithPreview,
      gameTierProgress?.currentTier.tierCode,
      isAllCategorySelected,
      topRankRisersSignals,
      topRankRisersSection?.categoryId,
    ],
  );

  const handleSelectTopVideoForChartView = useCallback(
    (viewId: ChartViewMode) => {
      const targetSection =
        viewId === 'buyable'
          ? sortedBuyableMarketChartSection
          : viewId === 'favorites'
          ? sortedBuyableFavoriteChartSection
          : viewId === 'music'
            ? sortedFilteredMusicChartSection
            : viewId === 'realtime-surging'
              ? sortedRealtimeSurgingSection
              : viewId === 'new-chart-entries'
                ? sortedNewChartEntriesSection
                : displaySelectedPlaybackSection;
      const topVideoId = targetSection?.items[0]?.id;

      if (!topVideoId || !targetSection?.categoryId) {
        return;
      }

      handleSelectVideoWithPreview(topVideoId, targetSection.categoryId);
    },
    [
      sortedBuyableMarketChartSection,
      sortedBuyableFavoriteChartSection,
      displaySelectedPlaybackSection,
      handleSelectVideoWithPreview,
      sortedNewChartEntriesSection,
      sortedRealtimeSurgingSection,
      sortedFilteredMusicChartSection,
    ],
  );
  const handleSelectChartViewFromModal = useCallback(
    (viewId: string, triggerElement?: HTMLButtonElement) => {
      handleSelectChartView(viewId, triggerElement);
      handleSelectTopVideoForChartView(viewId as ChartViewMode);
    },
    [handleSelectChartView, handleSelectTopVideoForChartView],
  );

  const handlePlayNextVideoWithPreview = useCallback(() => {
    if (isRestoredPlaybackActive) {
      const topChartVideoId = selectedPlaybackSection?.items[0]?.id;
      const topChartQueueId = selectedPlaybackSection?.categoryId;

      if (topChartVideoId && topChartQueueId) {
        setSelectedOpenPositionId(null);
        setSelectedScheduledSellOrderId(null);
        handleSelectVideo(topChartVideoId, topChartQueueId);
        return;
      }
    }

    if (activePlaybackQueueId === SCHEDULED_SELL_ORDERS_QUEUE_ID) {
      const nextScheduledOrder = getAdjacentGameScheduledSellOrder(scheduledSellOrders, {
        currentOrderId: selectedScheduledSellOrderId,
        currentVideoId: selectedVideoId,
        step: 1,
      });

      if (nextScheduledOrder) {
        setSelectedScheduledSellOrderId(nextScheduledOrder.id);
        setSelectedOpenPositionId(nextScheduledOrder.positionId);
        syncPlaybackSelection(nextScheduledOrder.videoId, SCHEDULED_SELL_ORDERS_QUEUE_ID);
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
        syncPlaybackSelection(nextHistoryPosition.videoId, HISTORY_PLAYBACK_QUEUE_ID);
        return;
      }
    }

    handlePlayNextVideo();
  }, [
    activePlaybackQueueId,
    gameHistoryPositions,
    scheduledSellOrders,
    handlePlayNextVideo,
    handleSelectVideo,
    syncPlaybackSelection,
    isRestoredPlaybackActive,
    openGamePositions,
    selectedOpenPositionId,
    selectedPlaybackSection,
    selectedScheduledSellOrderId,
    selectedVideoId,
  ]);

  const handlePlayPreviousVideoWithPreview = useCallback(() => {
    if (activePlaybackQueueId === SCHEDULED_SELL_ORDERS_QUEUE_ID) {
      const previousScheduledOrder = getAdjacentGameScheduledSellOrder(scheduledSellOrders, {
        currentOrderId: selectedScheduledSellOrderId,
        currentVideoId: selectedVideoId,
        step: -1,
      });

      if (previousScheduledOrder) {
        setSelectedScheduledSellOrderId(previousScheduledOrder.id);
        setSelectedOpenPositionId(previousScheduledOrder.positionId);
        syncPlaybackSelection(previousScheduledOrder.videoId, SCHEDULED_SELL_ORDERS_QUEUE_ID);
        return;
      }
    }

    if (activePlaybackQueueId === GAME_PORTFOLIO_QUEUE_ID) {
      const previousOpenPosition = getAdjacentGamePosition(openGamePositions, {
        currentPositionId: selectedOpenPositionId,
        currentVideoId: selectedVideoId,
        skipSameVideoId: true,
        step: -1,
      });

      if (previousOpenPosition) {
        setSelectedOpenPositionId(previousOpenPosition.id);
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
        syncPlaybackSelection(previousHistoryPosition.videoId, HISTORY_PLAYBACK_QUEUE_ID);
        return;
      }
    }

    handlePlayPreviousVideo();
  }, [
    activePlaybackQueueId,
    gameHistoryPositions,
    handlePlayPreviousVideo,
    syncPlaybackSelection,
    openGamePositions,
    scheduledSellOrders,
    selectedOpenPositionId,
    selectedScheduledSellOrderId,
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
  const handleOpenPositionBuyTradeModal = useCallback(
    (position: GamePosition) => {
      setTradeTargetVideoId(position.videoId);
      setTradeTargetPositionId(position.id);
      setActiveTradeModal('buy');
    },
    [setActiveTradeModal],
  );
  const handleOpenPositionSellTradeModal = useCallback(
    (position: GamePosition) => {
      setTradeTargetVideoId(position.videoId);
      setTradeTargetPositionId(position.id);
      setActiveTradeModal('sell');
    },
    [setActiveTradeModal],
  );
  const handleSelectGameHistoryVideo = useCallback(
    async (position: GamePosition) => {
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
  const handleSelectScheduledSellOrderVideo = useCallback(
    (order: GameScheduledSellOrder) => {
      setGameActionStatus(null);
      setSelectedScheduledSellOrderId(order.id);
      setSelectedOpenPositionId(order.positionId);
      scrollToPlayerStage();
      handleSelectVideoWithPreview(order.videoId, SCHEDULED_SELL_ORDERS_QUEUE_ID);
    },
    [handleSelectVideoWithPreview, scrollToPlayerStage, setGameActionStatus],
  );
  const handleSelectGameTab = useCallback((tab: 'positions' | 'scheduledOrders' | 'history' | 'guide') => {
    startTransition(() => {
      setActiveGameTab(tab);
    });
  }, []);
  const openGameModal = useCallback(
    (tab: 'positions' | 'history') => {
      openGameModalAction({
        refetchGameTradePanels,
        setActiveGameTab,
        setIsGameModalOpen,
        shouldLoadGame,
        tab,
      });
    },
    [refetchGameTradePanels, shouldLoadGame],
  );
  const handleOpenGameHistoryModal = useCallback(() => {
    openGameModal('history');
  }, [openGameModal]);
  const handleOpenGamePositionsModal = useCallback(() => {
    openGameModal('positions');
  }, [openGameModal]);
  const handleOpenTierHighlightsModal = useCallback(() => {
    setTierModalDefaultTab('highlights');
    openTierModal();
  }, [openTierModal]);
  const handleOpenTierOverviewModal = useCallback(() => {
    setTierModalDefaultTab('tier');
    openTierModal();
  }, [openTierModal]);
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
  const {
    handleCloseRankHistory,
    handleOpenGameHistoryChart,
    handleOpenGameNotificationChart: handleOpenGameNotificationRankChart,
    handleOpenGamePositionChart,
    handleOpenScheduledSellOrderChart,
    handleOpenSelectedVideoRankHistory,
    handleOpenVideoRankHistory,
    handleSelectGameHighlight,
    handleSelectGameNotification,
    handleSelectLeaderboardHighlight,
    isRankHistoryModalOpen,
    isVisibleRankHistoryLoading,
    rankHistoryFocusMode,
    visibleRankHistory,
    visibleRankHistoryError,
  } = useHomeRankHistory({
    accessToken,
    closeRankHistoryModal,
    gameHistoryPositions,
    openGamePositions,
    openRankHistoryModal,
    removeModalGameNotification,
    selectedRankHistoryPosition,
    selectedRegionCode: currentGameSeason?.regionCode ?? VIDEO_GAME_REGION_CODE,
    selectedVideoHistoryTargetPosition,
    selectedVideoId,
    selectedVideoRankHistoryVideoId,
    shouldLoadGame: isApiConfigured && Boolean(selectedRankHistoryPosition?.videoId ?? selectedVideoRankHistoryVideoId),
    userId: user?.id,
  });
  useLogoutOnUnauthorized(visibleRankHistoryError, logout);
  const gameActionContent = (
    <SelectedVideoGameActionsBundle
      buyActionTitle={buyActionTitle}
      canShowGameActions={canShowGameActions}
      fallbackRankLabel={selectedVideoRankLabel}
      fallbackViewCountLabel={selectedVideoStatLabel}
      isBuySubmitting={isBuySubmitting}
      isSelectedVideoBuyDisabled={isSelectedVideoBuyDisabled}
      isSelectedVideoSellDisabled={isSelectedVideoSellDisabled}
      isSellSubmitting={isSellSubmitting}
      mode="stage"
      onOpenBuyTradeModal={openBuyTradeModal}
      onOpenRankHistory={handleOpenSelectedVideoRankHistory}
      onOpenSellTradeModal={openSellTradeModal}
      selectedGameActionChannelTitle={selectedGameActionChannelTitle}
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
      maxSellQuantity={maxSellQuantity}
      preferMarketSummary
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
  const selectedLeaderboardEntry = selectedLeaderboardUserId
    ? gameLeaderboard.find((entry) => entry.userId === selectedLeaderboardUserId) ?? null
    : null;
  const selectedLeaderboardHighlightsTitle = selectedLeaderboardEntry
    ? `${selectedLeaderboardEntry.displayName}님의 하이라이트`
    : '하이라이트';
  const tierModalRankingContent = (
    <RankingGameLeaderboardTab
      entries={gameLeaderboard}
      error={gameLeaderboardError}
      highlights={selectedLeaderboardHighlights}
      highlightsError={selectedLeaderboardHighlightsError}
      highlightsTitle={selectedLeaderboardHighlightsTitle}
      isError={isGameLeaderboardError}
      isHighlightsError={isSelectedLeaderboardHighlightsError}
      isHighlightsLoading={isSelectedLeaderboardHighlightsLoading}
      isLoading={isGameLeaderboardLoading}
      onSelectHighlight={(highlight) => handleSelectLeaderboardHighlight(highlight, selectedLeaderboardUserId)}
      onSelectHighlightVideo={handleSelectLeaderboardHighlightVideo}
      onToggleUser={(userId) =>
        setSelectedLeaderboardUserId((currentUserId) => (currentUserId === userId ? null : userId))
      }
      season={currentGameSeason}
      selectedUserId={selectedLeaderboardUserId}
    />
  );
  const tierModalHighlightsContent = (
    <GameHighlightsTab
      highlights={gameHighlights}
      isLoading={isGameHighlightsLoading}
      onSelectHighlight={handleSelectGameHighlight}
      onSelectHighlightVideo={handleSelectGameHighlightVideo}
    />
  );
  const renderPortfolioContent = (isModal = false) => (
    <GamePanelSection
      activeGameTab={activeGameTab}
      activePlaybackQueueId={activePlaybackQueueId}
      authStatus={authStatus}
      canShowGameActions={canShowGameActions}
      tierProgress={gameTierProgress}
      computedWalletTotalAssetPoints={computedWalletTotalAssetPoints}
      currentGameSeason={currentGameSeason}
      currentGameSeasonUpdatedAt={currentGameSeasonUpdatedAt}
      favoriteStreamerVideoSection={favoriteStreamerVideoSection}
      favoriteTrendSignalsByVideoId={favoriteTrendSignalsByVideoId}
      gameHistoryPositions={gameHistoryPositions}
      gameMarketSignalsByVideoId={gameMarketSignalsByVideoId}
      gamePortfolioSection={gamePortfolioSection}
      hasApiConfigured={isApiConfigured}
      historyPlaybackLoadingVideoId={historyPlaybackLoadingVideoId}
      historyPlaybackSection={historyPlaybackSection}
      isCollapsed={isModal ? false : isRankingGameCollapsed}
      isGameHistoryLoading={isGameHistoryLoading}
      isOpenGamePositionsLoading={isOpenGamePositionsLoading}
      isScheduledSellOrdersLoading={isScheduledSellOrdersLoading}
      newChartEntriesSection={sortedNewChartEntriesSection}
      onCancelScheduledSellOrder={(orderId) => {
        void handleCancelScheduledSellOrder(orderId);
      }}
      onOpenTierModal={openTierModal}
      onOpenHistoryChart={handleOpenGameHistoryChart}
      onOpenPositionChart={handleOpenGamePositionChart}
      onRefreshTab={handleRefreshGameTab}
      onOpenScheduledSellOrderChart={handleOpenScheduledSellOrderChart}
      onOpenPositionBuyTradeModal={handleOpenPositionBuyTradeModal}
      onOpenPositionSellTradeModal={handleOpenPositionSellTradeModal}
      onSelectGameHistoryVideo={handleSelectGameHistoryVideo}
      onSelectGamePositionVideo={handleSelectGamePositionVideo}
      onSelectScheduledSellOrderVideo={handleSelectScheduledSellOrderVideo}
      onSelectTab={handleSelectGameTab}
      onToggleCollapse={() => toggleCollapsedSection(RANKING_GAME_SECTION_ID)}
      openDistinctVideoCount={openDistinctVideoCount}
      openGameHoldings={openGameHoldings}
      openPositionsBuyPoints={openPositionsBuyPoints}
      openPositionsEvaluationPoints={openPositionsEvaluationPoints}
      openPositionsProfitPoints={openPositionsProfitPoints}
      positionsEmptyMessage={positionsEmptyMessage}
      realtimeSurgingSection={sortedRealtimeSurgingSection}
      selectedPlaybackSection={selectedPlaybackSection}
      selectedVideoActions={null}
      selectedPositionId={selectedOpenPositionId}
      selectedScheduledSellOrderId={selectedScheduledSellOrderId}
      selectedVideoId={selectedVideoId}
      scheduledSellOrders={scheduledSellOrders}
      scheduledSellOrderCancelingId={
        cancelScheduledSellOrderMutation.isPending
          ? Number(cancelScheduledSellOrderMutation.variables)
          : null
      }
      trendSignalsByVideoId={chartTrendSignalsByVideoId}
    />
  );
  const isAnyModalOpen =
    isGameIntroModalOpen ||
    Boolean(modalGameNotification) ||
    isRankHistoryModalOpen ||
    isRegionModalOpen ||
    isChartViewModalOpen ||
    isGameModalOpen ||
    isWalletModalOpen ||
    isTierModalOpen ||
    isBuyTradeModalOpen ||
    isSellTradeModalOpen;
  const buyableVideoSearchOverlay =
    isBuyableVideoSearchLoading && !sortPrefetchStatus && !isAnyModalOpen ? (
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
  const sortPrefetchOverlay =
    sortPrefetchStatus && !isAnyModalOpen ? (
      <div className="app-shell__fullscreen-loading" role="status" aria-live="polite" aria-modal="true">
        <div className="app-shell__fullscreen-loading-card">
          <span className="app-shell__fullscreen-loading-spinner" aria-hidden="true" />
          <p className="app-shell__fullscreen-loading-eyebrow">Sorting Queue</p>
          <p className="app-shell__fullscreen-loading-title">전체 종목 불러오는 중</p>
          <p className="app-shell__fullscreen-loading-copy">
            낮은 순 정렬을 정확하게 계산하기 위해 남은 차트 종목을 확인하고 있습니다.
          </p>
          <p className="app-shell__fullscreen-loading-status">{sortPrefetchStatus}</p>
        </div>
      </div>
    ) : null;
  const tradeActionOverlay =
    isBuySubmitting || isSellSubmitting || isScheduledSellSubmitting ? (
      <div className="app-shell__fullscreen-loading" role="status" aria-live="polite" aria-modal="true">
        <div className="app-shell__fullscreen-loading-card">
          <span className="app-shell__fullscreen-loading-spinner" aria-hidden="true" />
          <p className="app-shell__fullscreen-loading-eyebrow">Trading Order</p>
          <p className="app-shell__fullscreen-loading-title">
            {isBuySubmitting ? '매수 처리 중' : isScheduledSellSubmitting ? '예약 매도 처리 중' : '매도 처리 중'}
          </p>
          <p className="app-shell__fullscreen-loading-copy">
            {isScheduledSellSubmitting
              ? '예약 조건과 수량을 확인한 뒤 자동 매도 주문을 등록하고 있습니다. 잠시만 기다려 주세요.'
              : '주문을 서버에 반영하고 지갑과 포지션을 갱신하고 있습니다. 잠시만 기다려 주세요.'}
          </p>
        </div>
      </div>
    ) : null;
  const fullscreenOverlayContainer =
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
        currentTierCode={gameTierProgress?.currentTier.tierCode}
        currentTierName={gameTierProgress?.currentTier.displayName}
        currentTierScore={gameTierProgress?.highlightScore}
        highlightCount={gameHighlights.length}
        isOpenPositionLimitReached={isOpenPositionLimitReached}
        openPositionCount={openDistinctVideoCount}
        isDarkMode={isDarkMode}
        isLoggingOut={isLoggingOut}
        onLogout={() => void logout()}
        onOpenGameModal={handleOpenGamePositionsModal}
        onOpenGameHistoryModal={handleOpenGameHistoryModal}
        onOpenGamePositionsModal={handleOpenGamePositionsModal}
        onOpenHighlightsModal={handleOpenTierHighlightsModal}
        onOpenRecentPlayback={handleOpenRecentPlayback}
        onClearGameNotifications={clearGameNotifications}
        onDeleteGameNotification={deleteGameNotification}
        onSelectGameNotification={handleSelectGameNotification}
        onRefreshGameNotifications={refreshGameNotifications}
        onRefreshProfile={refreshCurrentUser}
        onOpenTierModal={handleOpenTierOverviewModal}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onToggleThemeMode={handleToggleThemeMode}
        themeToggleLabel={themeToggleLabel}
        user={user}
        gameNotifications={gameNotifications}
        hasUnreadGameNotifications={hasUnreadGameNotifications}
        isGameNotificationsLoading={isGameNotificationsFetching}
        isTitleSaving={updateSelectedAchievementTitleMutation.isPending}
        walletBalancePoints={currentGameSeason?.wallet.balancePoints}
        onSelectTitle={async (titleCode) => {
          const optimisticSelectedTitle =
            titleCode && achievementTitleCollection
              ? achievementTitleCollection.titles.find((title) => title.code === titleCode && title.earned) ?? null
              : null;

          applyCurrentUser((currentUser) =>
            currentUser
              ? {
                  ...currentUser,
                  selectedTitle: optimisticSelectedTitle,
                }
              : currentUser,
          );
          await updateSelectedAchievementTitleMutation.mutateAsync(titleCode);
          await refreshCurrentUser();
          setAchievementTitleToastMessage(
            optimisticSelectedTitle
              ? `${optimisticSelectedTitle.displayName}으로 변경했어요.`
              : '대표 칭호를 해제했어요.',
          );
        }}
        titleCollection={achievementTitleCollection}
      />
      <main className="app-shell__main">
        <HomePlaybackSection
          isStickySelectedVideoPlaybackPaused={isPlaybackPaused}
          onPauseStickySelectedVideo={handlePauseCurrentVideo}
          onPlayNextStickySelectedVideo={handlePlayNextVideoWithPreview}
          onPlayPreviousStickySelectedVideo={handlePlayPreviousVideoWithPreview}
          onResumeStickySelectedVideo={handleResumeCurrentVideo}
          chartPanelProps={{
            chartErrorMessage: activeChartErrorMessage,
            marketPriceByVideoId,
            chartSortMode,
            chartSortOptions,
            collapsedFeaturedSectionIds,
            currentTierCode: gameTierProgress?.currentTier.tierCode,
            featuredSections: activeChartFeaturedSections,
            getRankLabel: activeChartRankLabel,
            getTradeActionState: getVideoCardTradeActionState,
            hasNextPage: activeChartHasNextPage,
            hasResolvedTrendSignals: activeChartHasResolvedTrendSignals,
            isChartError: activeChartIsError,
            isChartLoading: activeChartIsLoading,
            isFetchingNextPage: activeChartIsFetchingNextPage,
            mainSectionCollapseKey: activeChartMainSectionCollapseKey,
            onChangeChartSortMode: handleChangeChartSortMode,
            onLoadMore: activeChartOnLoadMore,
            onOpenBuyTradeModal: handleOpenVideoCardBuyTradeModal,
            onOpenChart: handleOpenVideoRankHistory,
            onOpenSellTradeModal: handleOpenVideoCardSellTradeModal,
            onSelectVideo: handleSelectVideoWithPreview,
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
            videoId: selectedVideoId,
            videoTitle: resolvedSelectedVideo?.snippet.title,
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
            headerSupplementalContent: headerTrendTicker,
            isChartLoading,
            isCinematicModeActive,
            isFavoriteToggleDisabled: !selectedChannelId || toggleFavoriteStreamerMutation.isPending,
            isManualPlaybackSaveDisabled:
              authStatus !== 'authenticated' || !selectedVideoId || isManualPlaybackSavePending,
            isMobileLayout,
            isOpenPositionLimitReached,
            isSelectedChannelFavorited,
            currentTierCode: gameTierProgress?.currentTier.tierCode,
            currentTierName: gameTierProgress?.currentTier.displayName,
            manualPlaybackSaveButtonLabel: isManualPlaybackSavePending ? '저장 중...' : '저장',
            manualPlaybackSaveStatus: manualPlaybackSaveStatus ?? undefined,
            onManualPlaybackSave: () => void handleManualPlaybackSave(),
            openPositionCount: openDistinctVideoCount,
            onNextVideo: handlePlayNextVideoWithPreview,
            onOpenGameModal: handleOpenGamePositionsModal,
            onOpenRegionModal: () => setIsRegionModalOpen(true),
            onOpenTierModal: isMobileLayout ? openTierModal : undefined,
            onOpenWalletModal: isMobileLayout ? () => setIsWalletModalOpen(true) : undefined,
            onOpenViewModal: openChartViewModal,
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
            walletBalancePoints: currentGameSeason?.wallet.balancePoints,
            selectedVideoChannelTitle: resolvedSelectedVideo?.snippet.channelTitle,
            selectedVideoId,
            selectedVideoRankLabel,
            selectedVideoStatLabel,
            selectedVideoTitle: resolvedSelectedVideo?.snippet.title,
            showManualPlaybackSave: false,
            stageActionContent: gameActionContent,
            stageMetadataContent,
            supplementalContent: undefined,
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
      <GameNotificationToast
        notification={visibleGameNotification}
        onDismiss={dismissVisibleGameNotification}
      />
      <GameActionToast
        message={gameActionStatus}
        onDismiss={() => setGameActionStatus(null)}
      />
      <AchievementTitleToast
        message={achievementTitleToastMessage}
        onDismiss={() => setAchievementTitleToastMessage(null)}
      />
      <GameNotificationModal
        notification={modalGameNotification}
        onClose={dismissModalGameNotification}
        onOpenChart={handleOpenGameNotificationRankChart}
      />
      <GameIntroModal
        isOpen={isGameIntroModalOpen}
        onClose={(dismissForever) => {
          setIsGameIntroModalOpen(false);

          if (dismissForever && typeof window !== 'undefined') {
            window.localStorage.setItem(GAME_INTRO_MODAL_DISMISSED_STORAGE_KEY, 'true');
          }
        }}
      />
      <GameRankHistoryModal
        error={
          visibleRankHistoryError instanceof Error
            ? visibleRankHistoryError
            : null
        }
        focusMode={rankHistoryFocusMode}
        history={visibleRankHistory}
        isLoading={isVisibleRankHistoryLoading}
        isOpen={isRankHistoryModalOpen}
        onClose={handleCloseRankHistory}
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
      <GameWalletModal
        computedWalletTotalAssetPoints={computedWalletTotalAssetPoints}
        currentTierCode={gameTierProgress?.currentTier.tierCode}
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        openPositionsBuyPoints={openPositionsBuyPoints}
        openPositionsEvaluationPoints={openPositionsEvaluationPoints}
        openPositionsProfitPoints={openPositionsProfitPoints}
        season={currentGameSeason}
        walletUpdatedAt={currentGameSeasonUpdatedAt}
      />
      <GamePanelModal isOpen={isGameModalOpen} onClose={() => setIsGameModalOpen(false)}>
        {renderPortfolioContent(true)}
      </GamePanelModal>
      <ChartViewModal
        isOpen={isChartViewModalOpen}
        onClose={closeChartViewModal}
        onSelectView={handleSelectChartViewFromModal}
        selectedViewId={effectiveChartView}
        viewOptions={chartViewOptions}
      />
      <GameTierModal
        defaultTab={tierModalDefaultTab}
        highlightsContent={tierModalHighlightsContent}
        isOpen={isTierModalOpen}
        isTierProgressLoading={isGameTierProgressLoading}
        onClose={closeTierModal}
        rankingContent={tierModalRankingContent}
        tierProgress={gameTierProgress}
      />
      <GameTradeModal
        confirmLabel={`${formatGameOrderQuantity(tradeNormalizedBuyQuantity)} 매수`}
        currentRankLabel={formatRank(tradeSelectedVideoCurrentChartRank, { chartOut: tradeSelectedVideoIsChartOut })}
        helperText={tradeBuyModalHelperText}
        isOpen={isBuyTradeModalOpen}
        isSubmitting={isBuySubmitting}
        maxQuantity={tradeMaxBuyQuantity}
        mode="buy"
        onChangeQuantity={handleBuyQuantityChange}
        onClose={closeTradeModalFromFlow}
        onConfirm={() => void handleBuyCurrentVideo()}
        quantity={tradeNormalizedBuyQuantity}
        summaryItems={[
          { label: '수량', value: formatGameOrderQuantity(tradeNormalizedBuyQuantity) },
          { label: '1개당 가격', value: formatPoints(tradeSelectedVideoUnitPricePoints ?? 0) },
          { label: '총 매수', value: formatPoints(tradeTotalSelectedVideoBuyPoints ?? (tradeSelectedVideoUnitPricePoints ?? 0)) },
          ...(typeof projectedWalletBalanceAfterBuy === 'number'
            ? [{ label: '거래 후 잔액', value: formatPoints(projectedWalletBalanceAfterBuy) }]
            : []),
        ]}
        summaryNote={undefined}
        thumbnailUrl={tradeSelectedVideoTradeThumbnailUrl}
        title={tradeSelectedGameActionTitle}
        unitPointsLabel={formatPoints(tradeSelectedVideoUnitPricePoints ?? 0)}
      />
      <GameTradeModal
        confirmLabel={
          sellOrderMode === 'scheduled'
            ? `${formatGameOrderQuantity(tradeNormalizedSellQuantity)} 예약 매도`
            : `${formatGameOrderQuantity(tradeNormalizedSellQuantity)} 즉시 매도`
        }
        currentRankLabel={formatRank(tradeSelectedVideoCurrentChartRank, { chartOut: tradeSelectedVideoIsChartOut })}
        detailContent={sellOrderMode === 'instant' ? (
          <GameSellPreviewDetail
            isLoading={isSellPreviewPending}
            preview={displaySellPreview}
          />
        ) : null}
        helperText={tradeSellModalHelperText}
        isOpen={isSellTradeModalOpen}
        isSubmitting={isSellSubmitting || isScheduledSellSubmitting}
        maxQuantity={tradeMaxSellQuantity}
        mode="sell"
        onChangeQuantity={handleSellQuantityChange}
        onClose={closeTradeModalFromFlow}
        onChangeSellOrderMode={canScheduleSellCurrentSelection ? setSellOrderMode : undefined}
        onChangeScheduledSellTriggerDirection={setScheduledSellTriggerDirection}
        onChangeScheduledSellTargetRank={setScheduledSellTargetRank}
        onConfirm={() => {
          void (sellOrderMode === 'scheduled' ? handleCreateScheduledSellOrder() : handleSellCurrentVideo());
        }}
        quantity={tradeNormalizedSellQuantity}
        scheduledSellConditionError={scheduledSellConditionError}
        scheduledSellTargetRank={scheduledSellTargetRank}
        scheduledSellTriggerDirection={scheduledSellTriggerDirection}
        sellOrderMode={sellOrderMode}
        summaryItems={
          sellOrderMode === 'scheduled'
            ? [
                {
                  label: '예약 조건',
                  value:
                    scheduledSellTargetRank == null
                      ? '순위를 입력해 주세요.'
                      : scheduledSellTriggerDirection === 'RANK_DROPS_TO'
                        ? `${formatRank(scheduledSellTargetRank)} 이하 이탈`
                        : `${formatRank(scheduledSellTargetRank)} 이내 진입`,
                },
                { label: '대상 수량', value: formatGameOrderQuantity(tradeNormalizedSellQuantity) },
                { label: '현재 순위', value: formatRank(tradeSelectedVideoCurrentChartRank, { chartOut: tradeSelectedVideoIsChartOut }) },
                { label: '처리 방식', value: '조건 도달 시 자동 매도' },
              ]
            : [
                { label: '수량', value: formatGameOrderQuantity(resolvedSellSummary.quantity) },
                { label: '정산 금액', value: formatPoints(resolvedSellSummary.settledPoints) },
                {
                  label: '해당 매도 시 하이라이트 점수',
                  value:
                    isSellPreviewPending
                      ? '계산 중'
                      : displaySellPreview
                        ? formatHighlightScore(displaySellPreview.projectedHighlightScore)
                        : '--',
                },
                {
                  label: '하이라이트 점수 증가량',
                  tone:
                    (displaySellPreview?.appliedHighlightScoreDelta ?? 0) > 0
                      ? 'gain'
                      : 'flat',
                  value:
                    isSellPreviewPending
                      ? '계산 중'
                      : displaySellPreview
                        ? formatHighlightScore(displaySellPreview.appliedHighlightScoreDelta)
                        : '--',
                },
                ...(typeof projectedWalletBalanceAfterSell === 'number'
                  ? [{ label: '거래 후 잔액', value: formatPoints(projectedWalletBalanceAfterSell) }]
                  : []),
                { label: '매도 금액', value: formatPoints(resolvedSellSummary.grossSellPoints) },
                { label: '수수료', value: formatPoints(resolvedSellSummary.feePoints) },
                {
                  label: '손익',
                  tone: getPointTone(resolvedSellSummary.pnlPoints),
                  value: formatPoints(resolvedSellSummary.pnlPoints),
                },
              ]
        }
        summaryNote={
          sellOrderMode === 'scheduled'
            ? '예약 매도는 현재 가격을 확정하지 않고, 조건이 충족되는 시점의 매도 로직으로 정산됩니다.'
            : `정산 금액은 매도 금액 기준 ${SELL_FEE_RATE_LABEL} 수수료를 반영한 값입니다.`
        }
        thumbnailUrl={tradeSelectedVideoTradeThumbnailUrl}
        title={tradeSelectedGameActionTitle}
        unitPointsLabel={sellTradeUnitPointsLabel}
      />
      {buyableVideoSearchOverlay && fullscreenOverlayContainer
        ? createPortal(buyableVideoSearchOverlay, fullscreenOverlayContainer)
        : null}
      {sortPrefetchOverlay && fullscreenOverlayContainer
        ? createPortal(sortPrefetchOverlay, fullscreenOverlayContainer)
        : null}
      {tradeActionOverlay && fullscreenOverlayContainer
        ? createPortal(tradeActionOverlay, fullscreenOverlayContainer)
        : null}
    </div>
  );
}

export default HomePage;
