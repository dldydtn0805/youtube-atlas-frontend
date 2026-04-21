import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import type { VideoPlayerHandle } from '../../components/VideoPlayer/VideoPlayer';
import AppHeader from './sections/AppHeader';
import { GameSelectedVideoPriceSummary, SelectedVideoGameActionsBundle } from './sections/GameActionContent';
import GameCoinModal from './sections/GameDividendModal';
import GameHighlightsTab from './sections/GameHighlightsTab';
import GamePanelModal from './sections/GamePanelModal';
import { ChartViewModal, RegionFilterModal } from './sections/FilterPanels';
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
import { shouldOpenGameNotificationModal } from './sections/gameNotificationModalUtils';
import {
  buildOpenGameHoldings,
  formatGameOrderQuantity,
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
  RESTORED_PLAYBACK_QUEUE_ID,
  findPlaybackQueueIdForVideo,
  filterVideoSection,
  getFullscreenElement,
  getAdjacentGamePosition,
  getVideoThumbnailUrl,
  mapGamePositionToVideoItem,
  mergeUniqueVideoItems,
  mergeSections,
  relabelVideoSection,
  resolvePlaybackCategoryLabel,
  shouldPrefetchBuyableVideos,
  sortVideoSection,
  sortedCountryCodes,
  type RegionCode,
} from './utils';
import type { ChartSortMode, ChartViewMode } from './types';
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
  useBuyableMarketChart,
  useBuyGamePosition,
  useCurrentGameSeason,
  useDeleteGameNotification,
  useDeleteGameNotifications,
  useGameCoinTierProgress,
  useGameHighlights,
  useGameLeaderboard,
  useGameLeaderboardHighlights,
  useGameLeaderboardPositionRankHistory,
  useGameMarket,
  useGameNotifications,
  useGamePositionRankHistory,
  useGameSellPreview,
  useMarkGameNotificationsRead,
  useMyGamePositions,
  useSellGamePositions,
} from '../../features/game/queries';
import { useGameNotificationRealtime, useGameRealtimeInvalidation } from '../../features/game/realtime';
import type {
  GameHighlight,
  GameNotification,
  GamePosition,
  GamePositionRankHistory,
} from '../../features/game/types';
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
const GAME_INTRO_MODAL_DISMISSED_STORAGE_KEY = 'youtube-atlas-game-intro-dismissed';
const RANKING_GAME_SECTION_ID = 'ranking-game';
const FULL_CHART_PREFETCH_SORT_MODES = new Set<ChartSortMode>([
  'popular-asc',
  'price-asc',
  'views-desc',
  'views-asc',
  'rank-up',
  'rank-down',
]);

function formatTierScore(score: number) {
  return formatPoints(score).replace(/P$/, '점');
}
const MAX_CHART_ITEM_COUNT = 200;
const MAX_SORT_PREFETCH_PAGE_COUNT = 10;
const CHART_SORT_OPTIONS: Array<{ id: ChartSortMode; label: string }> = [
  { id: 'popular-desc', label: '순위 높은 순' },
  { id: 'popular-asc', label: '순위 낮은 순' },
  { id: 'price-desc', label: '가격 높은 순' },
  { id: 'price-asc', label: '가격 낮은 순' },
  { id: 'views-desc', label: '조회 높은 순' },
  { id: 'views-asc', label: '조회 낮은 순' },
  { id: 'rank-up', label: '랭킹 상승 순' },
  { id: 'rank-down', label: '랭킹 하락 순' },
];

function getProjectedWalletBalance(currentBalancePoints?: number | null, deltaPoints?: number | null) {
  if (typeof currentBalancePoints !== 'number' || !Number.isFinite(currentBalancePoints)) {
    return null;
  }

  if (typeof deltaPoints !== 'number' || !Number.isFinite(deltaPoints)) {
    return null;
  }

  return currentBalancePoints + deltaPoints;
}

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

function getInitialGameIntroModalOpen() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(GAME_INTRO_MODAL_DISMISSED_STORAGE_KEY) !== 'true';
}

function mergeGameNotifications(...groups: Array<GameNotification[] | undefined>) {
  const notificationsById = new Map<string, GameNotification>();

  groups.flatMap((group) => group ?? []).forEach((notification) => {
    if (!notificationsById.has(notification.id)) {
      notificationsById.set(notification.id, notification);
    }
  });

  return [...notificationsById.values()]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 20);
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

function HomePage() {
  const queryClient = useQueryClient();
  const { accessToken, isLoggingOut, logout, refreshCurrentUser, status: authStatus, user } = useAuth();
  const [selectedOpenPositionId, setSelectedOpenPositionId] = useState<number | null>(null);
  const [activeGameTab, setActiveGameTab] = useState<'positions' | 'history' | 'guide'>('positions');
  const [rankHistoryFocusMode, setRankHistoryFocusMode] = useState<'full' | 'trade'>('full');
  const [isBuyableOnlyFilterActive, setIsBuyableOnlyFilterActive] = useState(false);
  const [collapsedHomeSectionIds, setCollapsedHomeSectionIds] = useState(getInitialCollapsedHomeSectionIds);
  const [selectedLeaderboardUserId, setSelectedLeaderboardUserId] = useState<number | null>(null);
  const [historyPlaybackVideo, setHistoryPlaybackVideo] = useState<YouTubeVideoItem | null>(null);
  const [historyPlaybackLoadingVideoId, setHistoryPlaybackLoadingVideoId] = useState<string | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isGameIntroModalOpen, setIsGameIntroModalOpen] = useState(getInitialGameIntroModalOpen);
  const [pushedGameNotifications, setPushedGameNotifications] = useState<GameNotification[]>([]);
  const [modalGameNotification, setModalGameNotification] = useState<GameNotification | null>(null);
  const [visibleGameNotification, setVisibleGameNotification] = useState<GameNotification | null>(null);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isChartViewModalOpen, setIsChartViewModalOpen] = useState(false);
  const [pendingRegionTopVideoSelection, setPendingRegionTopVideoSelection] = useState<string | null>(null);
  const [isPlaybackPaused, setIsPlaybackPaused] = useState(false);
  const [selectedChartView, setSelectedChartView] = useState<ChartViewMode>('popular');
  const [chartSortMode, setChartSortMode] = useState<ChartSortMode>('popular-desc');
  const [sortPrefetchStatus, setSortPrefetchStatus] = useState<string | null>(null);
  const [selectedRankHistoryOwnerUserId, setSelectedRankHistoryOwnerUserId] = useState<number | null>(null);
  const chartSortOptions = useMemo(
    () =>
      authStatus === 'authenticated'
        ? CHART_SORT_OPTIONS
        : CHART_SORT_OPTIONS.filter((option) => option.id !== 'price-desc' && option.id !== 'price-asc'),
    [authStatus],
  );
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

  useEffect(() => {
    if (authStatus !== 'authenticated' && (chartSortMode === 'price-desc' || chartSortMode === 'price-asc')) {
      setChartSortMode('popular-desc');
    }
  }, [authStatus, chartSortMode]);

  useEffect(() => {
    setPushedGameNotifications([]);
    setVisibleGameNotification(null);
  }, [user?.id]);

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
  const handleRealtimeGameNotification = useCallback((notification: GameNotification) => {
    setPushedGameNotifications((currentNotifications) =>
      mergeGameNotifications([notification], currentNotifications),
    );
    setVisibleGameNotification(notification);

    if (shouldOpenGameNotificationModal(notification)) {
      setModalGameNotification(notification);
    }
  }, []);
  useGameNotificationRealtime(
    accessToken,
    selectedRegionCode,
    handleRealtimeGameNotification,
    shouldLoadGame,
  );

  const {
    data: currentGameSeason,
    error: currentGameSeasonError,
    isLoading: isCurrentGameSeasonLoading,
    dataUpdatedAt: currentGameSeasonUpdatedAt,
  } = useCurrentGameSeason(accessToken, selectedRegionCode, shouldLoadGame);
  const {
    data: fetchedGameNotifications = [],
    isFetching: isGameNotificationsFetching,
    refetch: refetchGameNotifications,
  } = useGameNotifications(accessToken, selectedRegionCode, false);
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
    window.__emitGameNotificationTest = (notification) => {
      const now = new Date().toISOString();
      const notificationType = notification?.notificationType ?? 'MOONSHOT';

      handleRealtimeGameNotification({
        id: notification?.id ?? `game-test-${Date.now()}-${notificationType}`,
        notificationType,
        title: notification?.title ?? '문샷 적중',
        message: notification?.message ?? '테스트 소켓 알림입니다.',
        positionId: notification?.positionId ?? 999_999,
        videoId: notification?.videoId ?? 'test-video',
        videoTitle: notification?.videoTitle ?? '콘솔 테스트 영상',
        channelTitle: notification?.channelTitle ?? '테스트 채널',
        thumbnailUrl: notification?.thumbnailUrl ?? 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        strategyTags: notification?.strategyTags ?? [notificationType],
        highlightScore: notification?.highlightScore ?? 12_345,
        readAt: notification?.readAt ?? null,
        createdAt: notification?.createdAt ?? now,
        showModal: notification?.showModal ?? true,
      });
    };

    return () => {
      delete window.__emitGameRealtimeTest;
      delete window.__emitGameNotificationTest;
    };
  }, [
    accessToken,
    currentGameSeason?.seasonId,
    handleRealtimeGameNotification,
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
    isLoading: isOpenGamePositionsLoading,
  } = useMyGamePositions(accessToken, selectedRegionCode, 'OPEN', shouldLoadGame);
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
    data: gameHistoryPositions = [],
    error: gameHistoryPositionsError,
    isLoading: isGameHistoryLoading,
  } = useMyGamePositions(accessToken, selectedRegionCode, '', shouldLoadGame, 30);
  const {
    data: gameHighlights = [],
    error: gameHighlightsError,
    isLoading: isGameHighlightsLoading,
  } = useGameHighlights(accessToken, selectedRegionCode, shouldLoadGame);
  const markGameNotificationsReadMutation = useMarkGameNotificationsRead(accessToken, selectedRegionCode);
  const deleteGameNotificationsMutation = useDeleteGameNotifications(accessToken, selectedRegionCode);
  const deleteGameNotificationMutation = useDeleteGameNotification(accessToken, selectedRegionCode);
  const gameNotifications = useMemo(
    () => mergeGameNotifications(
      pushedGameNotifications,
      fetchedGameNotifications,
      currentGameSeason?.notifications,
    ),
    [currentGameSeason?.notifications, fetchedGameNotifications, pushedGameNotifications],
  );
  const clearGameNotifications = useCallback(async () => {
    if (!accessToken || gameNotifications.length === 0) {
      return;
    }

    const previousPushedNotifications = pushedGameNotifications;
    const previousModalNotification = modalGameNotification;
    const previousVisibleNotification = visibleGameNotification;
    setPushedGameNotifications([]);
    setModalGameNotification(null);
    setVisibleGameNotification(null);

    try {
      await deleteGameNotificationsMutation.mutateAsync();
    } catch (error) {
      setPushedGameNotifications(previousPushedNotifications);
      setModalGameNotification(previousModalNotification);
      setVisibleGameNotification(previousVisibleNotification);
      throw error;
    }
  }, [
    accessToken,
    deleteGameNotificationsMutation,
    gameNotifications.length,
    modalGameNotification,
    pushedGameNotifications,
    visibleGameNotification,
  ]);
  const deleteGameNotification = useCallback(async (notificationId: string) => {
    if (!accessToken) {
      return;
    }

    const previousPushedNotifications = pushedGameNotifications;
    const previousModalNotification = modalGameNotification;
    const previousVisibleNotification = visibleGameNotification;
    setPushedGameNotifications((notifications) =>
      notifications.filter((notification) => notification.id !== notificationId),
    );
    setModalGameNotification((notification) => notification?.id === notificationId ? null : notification);
    setVisibleGameNotification((notification) => notification?.id === notificationId ? null : notification);

    try {
      await deleteGameNotificationMutation.mutateAsync(notificationId);
    } catch (error) {
      setPushedGameNotifications(previousPushedNotifications);
      setModalGameNotification(previousModalNotification);
      setVisibleGameNotification(previousVisibleNotification);
      throw error;
    }
  }, [
    accessToken,
    deleteGameNotificationMutation,
    modalGameNotification,
    pushedGameNotifications,
    visibleGameNotification,
  ]);
  const refreshGameNotifications = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    await refetchGameNotifications();
    setPushedGameNotifications([]);
    setModalGameNotification(null);
    setVisibleGameNotification(null);

    void markGameNotificationsReadMutation.mutateAsync().catch(() => {
      // The notification list should remain usable even if read marking fails.
    });
  }, [
    accessToken,
    markGameNotificationsReadMutation,
    refetchGameNotifications,
  ]);
  const hasUnreadGameNotifications = gameNotifications.some(
    (notification) => !notification.readAt,
  );

  useEffect(() => {
    if (!visibleGameNotification) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleGameNotification(null);
    }, 6_000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [visibleGameNotification]);
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
  const buyableMarketChartSection = useMemo(
    () =>
      mergeSections(buyableMarketChartData?.pages) ?? {
        categoryId: 'buyable-market',
        description: '현재 지갑과 보유 상태 기준으로 바로 매수 가능한 영상만 모았습니다.',
        items: [],
        label: '매수 가능',
      },
    [buyableMarketChartData?.pages],
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
  const marketPriceByVideoId = useMemo(
    () =>
      Object.fromEntries(
        gameMarket.map((marketVideo) => [marketVideo.videoId, marketVideo.currentPricePoints]),
      ),
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
    () => sortVideoSection(filteredMusicChartSection, chartSortMode, { marketVideos: gameMarket }),
    [chartSortMode, filteredMusicChartSection, gameMarket],
  );
  const sortedBuyableMarketChartSection = useMemo(
    () => sortVideoSection(buyableMarketChartSection, chartSortMode, { marketVideos: gameMarket }),
    [buyableMarketChartSection, chartSortMode, gameMarket],
  );
  const musicTrendSignalsByVideoId = useMemo(
    () => mapMusicTrendSignalsByVideoId(musicPlaybackSection, selectedRegionCode),
    [musicPlaybackSection, selectedRegionCode],
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
      items: [...openGamePositions]
        .sort((left, right) => new Date(right.buyCapturedAt).getTime() - new Date(left.buyCapturedAt).getTime())
        .map(mapGamePositionToVideoItem),
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
  const displaySelectedPlaybackSection = useMemo(
    () => {
      const labeledSection = shouldShowTop200Label
        ? relabelVideoSection(filteredSelectedPlaybackSection, 'TOP 200')
        : filteredSelectedPlaybackSection;

      return sortVideoSection(labeledSection, chartSortMode, { marketVideos: gameMarket });
    },
    [chartSortMode, filteredSelectedPlaybackSection, gameMarket, shouldShowTop200Label],
  );
  const sortedBuyableFavoriteChartSection = useMemo(
    () => sortVideoSection(buyableFavoriteChartSection, chartSortMode, { marketVideos: gameMarket }),
    [buyableFavoriteChartSection, chartSortMode, gameMarket],
  );
  const sortedRealtimeSurgingSection = useMemo(
    () => sortVideoSection(realtimeSurgingSection, chartSortMode, { marketVideos: gameMarket }),
    [chartSortMode, gameMarket, realtimeSurgingSection],
  );
  const sortedNewChartEntriesSection = useMemo(
    () => sortVideoSection(newChartEntriesSection, chartSortMode, { marketVideos: gameMarket }),
    [chartSortMode, gameMarket, newChartEntriesSection],
  );
  const sortedFeaturedChartSections = useMemo(
    () =>
      featuredChartSections.map((featuredSection) => {
        const sortedSection =
          featuredSection.section.categoryId === sortedRealtimeSurgingSection?.categoryId
            ? sortedRealtimeSurgingSection
            : featuredSection.section.categoryId === sortedNewChartEntriesSection?.categoryId
              ? sortedNewChartEntriesSection
              : sortVideoSection(featuredSection.section, chartSortMode, { marketVideos: gameMarket });

        return {
          ...featuredSection,
          section: sortedSection ?? featuredSection.section,
        };
      }),
    [
      chartSortMode,
      featuredChartSections,
      gameMarket,
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
          const initialItemCount = Math.min(buyableMarketChartSection.items.length, MAX_CHART_ITEM_COUNT);

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
      buyableMarketChartSection.items.length,
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
    extraPlaybackSections,
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
  const [previewVideoId, setPreviewVideoId] = useState<string | undefined>();
  const selectedPlaybackCategoryLabel = useMemo(
    () =>
      resolvePlaybackCategoryLabel({
        activePlaybackQueueId,
        extraPlaybackSections,
        fallbackLabel: selectedChartViewOption.label,
        favoriteStreamerVideoSection,
        newChartEntriesSection: sortedNewChartEntriesSection,
        realtimeSurgingSection: sortedRealtimeSurgingSection,
        selectedPlaybackSection: labeledSelectedPlaybackSection,
        selectedVideoId,
      }),
    [
      activePlaybackQueueId,
      extraPlaybackSections,
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
  const isRankingGameCollapsed = collapsedHomeSectionIds.includes(RANKING_GAME_SECTION_ID);
  const collapsedFeaturedSectionIds = collapsedHomeSectionIds;
  const toggleCollapsedSection = useCallback((sectionId: string) => {
    setCollapsedHomeSectionIds((currentSectionIds) =>
      currentSectionIds.includes(sectionId)
        ? currentSectionIds.filter((currentSectionId) => currentSectionId !== sectionId)
        : [...currentSectionIds, sectionId],
    );
  }, []);

  const isForeignSelectedRankHistory =
    selectedRankHistoryOwnerUserId !== null && selectedRankHistoryOwnerUserId !== user?.id;
  const {
    data: mySelectedPositionRankHistory,
    error: mySelectedPositionRankHistoryError,
    isLoading: isMyPositionRankHistoryLoading,
  } = useGamePositionRankHistory(
    accessToken,
    selectedRankHistoryPosition?.id ?? null,
    shouldLoadGame &&
      Boolean(selectedRankHistoryPosition) &&
      !isForeignSelectedRankHistory,
  );
  const {
    data: leaderboardSelectedPositionRankHistory,
    error: leaderboardSelectedPositionRankHistoryError,
    isLoading: isLeaderboardPositionRankHistoryLoading,
  } = useGameLeaderboardPositionRankHistory(
    accessToken,
    isForeignSelectedRankHistory ? selectedRankHistoryOwnerUserId : null,
    selectedRankHistoryPosition?.id ?? null,
    selectedRegionCode,
    shouldLoadGame && Boolean(selectedRankHistoryPosition) && isForeignSelectedRankHistory,
  );
  const selectedPositionRankHistory = isForeignSelectedRankHistory
    ? leaderboardSelectedPositionRankHistory
    : mySelectedPositionRankHistory;
  const selectedPositionRankHistoryError = isForeignSelectedRankHistory
    ? leaderboardSelectedPositionRankHistoryError
    : mySelectedPositionRankHistoryError;
  const isPositionRankHistoryLoading = isForeignSelectedRankHistory
    ? isLeaderboardPositionRankHistoryLoading
    : isMyPositionRankHistoryLoading;
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
      enabled:
        shouldLoadGame &&
        Boolean(accessToken) &&
        Boolean(selectedRankHistoryPosition) &&
        !isForeignSelectedRankHistory &&
        position.id !== selectedRankHistoryPosition?.id,
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
  useLogoutOnUnauthorized(gameCoinTierProgressError, logout);
  useLogoutOnUnauthorized(gameMarketError, logout);
  useLogoutOnUnauthorized(buyableMarketChartError, logout);
  useLogoutOnUnauthorized(openGamePositionsError, logout);
  useLogoutOnUnauthorized(gameHistoryPositionsError, logout);
  useLogoutOnUnauthorized(gameHighlightsError, logout);
  useLogoutOnUnauthorized(selectedLeaderboardHighlightsError, logout);
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
  const sellPreviewRequest = useMemo(
    () =>
      normalizedSellQuantity > 0
        ? {
            positionId: selectedSellPositionId ?? undefined,
            quantity: normalizedSellQuantity,
            regionCode: selectedRegionCode,
            videoId: selectedSellPositionId == null ? selectedVideoId : undefined,
          }
        : null,
    [normalizedSellQuantity, selectedRegionCode, selectedSellPositionId, selectedVideoId],
  );
  const sellPreviewQuery = useGameSellPreview(
    accessToken,
    sellPreviewRequest,
    activeTradeModal === 'sell' && maxSellQuantity > 0,
  );
  const resolvedSellSummary = useMemo(
    () =>
      sellPreviewQuery.data
        ? {
            feePoints: sellPreviewQuery.data.sellPricePoints - sellPreviewQuery.data.settledPoints,
            grossSellPoints: sellPreviewQuery.data.sellPricePoints,
            pnlPoints: sellPreviewQuery.data.pnlPoints,
            quantity: sellPreviewQuery.data.quantity,
            settledPoints: sellPreviewQuery.data.settledPoints,
            stakePoints: sellPreviewQuery.data.stakePoints,
          }
        : selectedVideoSellSummary,
    [selectedVideoSellSummary, sellPreviewQuery.data],
  );
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
    onBuySuccess: refetchCurrentChartAfterBuy,
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

  const projectedWalletBalanceAfterBuy = useMemo(
    () =>
      getProjectedWalletBalance(
        currentGameSeason?.wallet.balancePoints,
        -(totalSelectedVideoBuyPoints ?? (selectedVideoUnitPricePoints ?? 0)),
      ),
    [currentGameSeason?.wallet.balancePoints, selectedVideoUnitPricePoints, totalSelectedVideoBuyPoints],
  );
  const projectedWalletBalanceAfterSell = useMemo(
    () =>
      getProjectedWalletBalance(currentGameSeason?.wallet.balancePoints, resolvedSellSummary.settledPoints),
    [currentGameSeason?.wallet.balancePoints, resolvedSellSummary.settledPoints],
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
  const handleOpenRecentPlayback = useCallback(
    (videoId: string) => {
      if (!videoId) {
        return;
      }

      const playbackQueueId =
        findPlaybackQueueIdForVideo(videoId, {
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
      selectedPlaybackSection,
      sortedNewChartEntriesSection,
      sortedRealtimeSurgingSection,
    ],
  );
  const headerTrendTicker = useMemo(
    () => {
      if (!isAllCategorySelected || topRankRisersSignals.length === 0 || !topRankRisersSection?.categoryId) {
        return undefined;
      }

      return (
        <TrendTicker
          currentTierCode={gameCoinTierProgress?.currentTier.tierCode}
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
      gameCoinTierProgress?.currentTier.tierCode,
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
  const handleOpenPositionBuyTradeModal = useCallback(
    (position: GamePosition) => {
      handleSelectGamePositionVideo(position);
      window.setTimeout(openBuyTradeModal, 0);
    },
    [handleSelectGamePositionVideo, openBuyTradeModal],
  );
  const handleOpenPositionSellTradeModal = useCallback(
    (position: GamePosition) => {
      handleSelectGamePositionVideo(position);
      window.setTimeout(openSellTradeModal, 0);
    },
    [handleSelectGamePositionVideo, openSellTradeModal],
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
  const handleOpenGamePositionChart = useCallback(
    (position: GamePosition) => {
      setSelectedRankHistoryOwnerUserId(null);
      setRankHistoryFocusMode('trade');
      openRankHistoryModal(position.videoId, position);
    },
    [openRankHistoryModal],
  );
  const handleOpenGameHistoryChart = useCallback(
    (position: GamePosition) => {
      setSelectedRankHistoryOwnerUserId(null);
      setRankHistoryFocusMode('trade');
      openRankHistoryModal(position.videoId, position);
    },
    [openRankHistoryModal],
  );
  const handleSelectGameTab = useCallback((tab: 'positions' | 'history' | 'guide') => {
    startTransition(() => {
      setActiveGameTab(tab);
    });
  }, []);
  const handleSelectGameHighlight = useCallback(
    (highlight: GameHighlight) => {
      setSelectedRankHistoryOwnerUserId(null);
      setRankHistoryFocusMode('trade');
      openRankHistoryModal(highlight.videoId, {
        id: highlight.positionId,
        videoId: highlight.videoId,
        title: highlight.videoTitle,
        channelTitle: highlight.channelTitle,
        thumbnailUrl: highlight.thumbnailUrl,
        buyRank: highlight.buyRank,
        currentRank: highlight.highlightRank,
        rankDiff: highlight.rankDiff,
        quantity: highlight.quantity,
        stakePoints: highlight.stakePoints,
        currentPricePoints: highlight.currentPricePoints,
        profitPoints: highlight.profitPoints,
        chartOut: false,
        status: highlight.status,
        buyCapturedAt: highlight.createdAt,
        createdAt: highlight.createdAt,
        closedAt: highlight.status === 'OPEN' ? null : highlight.createdAt,
      });
    },
    [openRankHistoryModal],
  );
  const handleSelectLeaderboardHighlight = useCallback(
    (highlight: GameHighlight) => {
      setSelectedRankHistoryOwnerUserId(selectedLeaderboardUserId);
      setRankHistoryFocusMode('trade');
      openRankHistoryModal(highlight.videoId, {
        id: highlight.positionId,
        videoId: highlight.videoId,
        title: highlight.videoTitle,
        channelTitle: highlight.channelTitle,
        thumbnailUrl: highlight.thumbnailUrl,
        buyRank: highlight.buyRank,
        currentRank: highlight.highlightRank,
        rankDiff: highlight.rankDiff,
        quantity: highlight.quantity,
        stakePoints: highlight.stakePoints,
        currentPricePoints: highlight.currentPricePoints,
        profitPoints: highlight.profitPoints,
        chartOut: false,
        status: highlight.status,
        buyCapturedAt: highlight.createdAt,
        createdAt: highlight.createdAt,
        closedAt: highlight.status === 'OPEN' ? null : highlight.createdAt,
      });
    },
    [openRankHistoryModal, selectedLeaderboardUserId],
  );
  const handleSelectGameNotification = useCallback(
    (notification: GameNotification) => {
      const matchedPosition =
        openGamePositions.find((position) => position.id === notification.positionId) ??
        gameHistoryPositions.find((position) => position.id === notification.positionId) ??
        null;

      setSelectedRankHistoryOwnerUserId(null);
      setRankHistoryFocusMode(matchedPosition ? 'trade' : 'full');
      openRankHistoryModal(notification.videoId, matchedPosition);
    },
    [gameHistoryPositions, openGamePositions, openRankHistoryModal],
  );
  const handleOpenSelectedVideoRankHistory = useCallback(() => {
    setSelectedRankHistoryOwnerUserId(null);
    setRankHistoryFocusMode('full');
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
  const handleCloseRankHistoryModal = useCallback(() => {
    setRankHistoryFocusMode('full');
    setSelectedRankHistoryOwnerUserId(null);
    closeRankHistoryModal();
  }, [closeRankHistoryModal]);
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
  const coinModalRankingContent = (
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
      onSelectHighlight={handleSelectLeaderboardHighlight}
      onToggleUser={(userId) =>
        setSelectedLeaderboardUserId((currentUserId) => (currentUserId === userId ? null : userId))
      }
      season={currentGameSeason}
      selectedUserId={selectedLeaderboardUserId}
    />
  );
  const coinModalHighlightsContent = (
    <GameHighlightsTab
      highlights={gameHighlights}
      isLoading={isGameHighlightsLoading}
      onSelectHighlight={handleSelectGameHighlight}
    />
  );
  const renderPortfolioContent = (isModal = false) => (
    <GamePanelSection
      activeGameTab={activeGameTab}
      activePlaybackQueueId={activePlaybackQueueId}
      authStatus={authStatus}
      canShowGameActions={canShowGameActions}
      coinTierProgress={gameCoinTierProgress}
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
      newChartEntriesSection={sortedNewChartEntriesSection}
      onOpenCoinModal={openCoinModal}
      onOpenHistoryChart={handleOpenGameHistoryChart}
      onOpenPositionChart={handleOpenGamePositionChart}
      onOpenPositionBuyTradeModal={handleOpenPositionBuyTradeModal}
      onOpenPositionSellTradeModal={handleOpenPositionSellTradeModal}
      onSelectGameHistoryVideo={handleSelectGameHistoryVideo}
      onSelectGamePositionVideo={handleSelectGamePositionVideo}
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
      selectedVideoId={selectedVideoId}
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
  const visibleRankHistory = rankHistoryFocusMode === 'trade'
    ? selectedPositionRankHistory
    : mergedRankHistory;
  const visibleRankHistoryError =
    rankHistoryFocusMode === 'trade'
      ? selectedPositionRankHistoryError
      : selectedPositionRankHistoryError instanceof Error
        ? selectedPositionRankHistoryError
        : relatedPositionRankHistoryError instanceof Error
          ? relatedPositionRankHistoryError
          : selectedVideoRankHistoryError;
  const isVisibleRankHistoryLoading =
    rankHistoryFocusMode === 'trade'
      ? isPositionRankHistoryLoading
      : isPositionRankHistoryLoading || isRelatedPositionRankHistoryLoading || isVideoRankHistoryLoading;
  const isBuyTradeModalOpen =
    activeTradeModal === 'buy' && Boolean(selectedVideoId) && Boolean(selectedVideoMarketEntry);
  const isSellTradeModalOpen =
    activeTradeModal === 'sell' && Boolean(selectedVideoId) && selectedVideoOpenPositionCount > 0;
  const isAnyModalOpen =
    isGameIntroModalOpen ||
    Boolean(modalGameNotification) ||
    isRankHistoryModalOpen ||
    isRegionModalOpen ||
    isGameModalOpen ||
    isWalletModalOpen ||
    isCoinModalOpen ||
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
    isBuySubmitting || isSellSubmitting ? (
      <div className="app-shell__fullscreen-loading" role="status" aria-live="polite" aria-modal="true">
        <div className="app-shell__fullscreen-loading-card">
          <span className="app-shell__fullscreen-loading-spinner" aria-hidden="true" />
          <p className="app-shell__fullscreen-loading-eyebrow">Trading Order</p>
          <p className="app-shell__fullscreen-loading-title">
            {isBuySubmitting ? '매수 처리 중' : '매도 처리 중'}
          </p>
          <p className="app-shell__fullscreen-loading-copy">
            주문을 서버에 반영하고 지갑과 포지션을 갱신하고 있습니다. 잠시만 기다려 주세요.
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
        currentTierCode={gameCoinTierProgress?.currentTier.tierCode}
        currentTierName={gameCoinTierProgress?.currentTier.displayName}
        isDarkMode={isDarkMode}
        isLoggingOut={isLoggingOut}
        onLogout={() => void logout()}
        onOpenGameModal={() => setIsGameModalOpen(true)}
        onOpenRecentPlayback={handleOpenRecentPlayback}
        onClearGameNotifications={clearGameNotifications}
        onDeleteGameNotification={deleteGameNotification}
        onSelectGameNotification={handleSelectGameNotification}
        onRefreshGameNotifications={refreshGameNotifications}
        onRefreshProfile={refreshCurrentUser}
        onOpenTierModal={openCoinModal}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onToggleThemeMode={handleToggleThemeMode}
        themeToggleLabel={themeToggleLabel}
        user={user}
        gameNotifications={gameNotifications}
        hasUnreadGameNotifications={hasUnreadGameNotifications}
        isGameNotificationsLoading={isGameNotificationsFetching}
        walletBalancePoints={currentGameSeason?.wallet.balancePoints}
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
            chartErrorMessage: activeChartErrorMessage,
            marketPriceByVideoId,
            chartSortMode,
            chartSortOptions,
            collapsedFeaturedSectionIds,
            currentTierCode: gameCoinTierProgress?.currentTier.tierCode,
            featuredSections: activeChartFeaturedSections,
            getRankLabel: activeChartRankLabel,
            hasNextPage: activeChartHasNextPage,
            hasResolvedTrendSignals: activeChartHasResolvedTrendSignals,
            isChartError: activeChartIsError,
            isChartLoading: activeChartIsLoading,
            isFetchingNextPage: activeChartIsFetchingNextPage,
            mainSectionCollapseKey: activeChartMainSectionCollapseKey,
            onChangeChartSortMode: handleChangeChartSortMode,
            onLoadMore: activeChartOnLoadMore,
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
            isSelectedChannelFavorited,
            currentTierCode: gameCoinTierProgress?.currentTier.tierCode,
            currentTierName: gameCoinTierProgress?.currentTier.displayName,
            manualPlaybackSaveButtonLabel: isManualPlaybackSavePending ? '저장 중...' : '저장',
            manualPlaybackSaveStatus: manualPlaybackSaveStatus ?? undefined,
            onManualPlaybackSave: () => void handleManualPlaybackSave(),
            onNextVideo: handlePlayNextVideoWithPreview,
            onOpenGameModal: () => setIsGameModalOpen(true),
            onOpenRegionModal: () => setIsRegionModalOpen(true),
            onOpenTierModal: isMobileLayout ? openCoinModal : undefined,
            onOpenWalletModal: isMobileLayout ? () => setIsWalletModalOpen(true) : undefined,
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
        onDismiss={() => setVisibleGameNotification(null)}
      />
      <GameNotificationModal
        notification={modalGameNotification}
        onClose={() => setModalGameNotification(null)}
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
        onClose={handleCloseRankHistoryModal}
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
        currentTierCode={gameCoinTierProgress?.currentTier.tierCode}
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        openDistinctVideoCount={openDistinctVideoCount}
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
        onClose={() => setIsChartViewModalOpen(false)}
        onSelectView={handleSelectChartViewFromModal}
        selectedViewId={effectiveChartView}
        viewOptions={chartViewOptions}
      />
      <GameCoinModal
        highlightsContent={coinModalHighlightsContent}
        isOpen={isCoinModalOpen}
        onClose={closeCoinModal}
        rankingContent={coinModalRankingContent}
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
          ...(typeof projectedWalletBalanceAfterBuy === 'number'
            ? [{ label: '거래 후 잔액', value: formatPoints(projectedWalletBalanceAfterBuy) }]
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
        detailContent={
          <GameSellPreviewDetail
            isLoading={sellPreviewQuery.isLoading || sellPreviewQuery.isFetching}
            preview={sellPreviewQuery.data}
          />
        }
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
          { label: '수량', value: formatGameOrderQuantity(resolvedSellSummary.quantity) },
          { label: '정산 금액', value: formatPoints(resolvedSellSummary.settledPoints) },
          {
            label: '예상 티어 점수',
            value:
              sellPreviewQuery.isLoading || sellPreviewQuery.isFetching
                ? '계산 중'
                : formatTierScore(sellPreviewQuery.data?.projectedHighlightScore ?? 0),
          },
          {
            label: '실제 반영',
            tone:
              (sellPreviewQuery.data?.appliedHighlightScoreDelta ?? 0) > 0
                ? 'gain'
                : 'flat',
            value:
              sellPreviewQuery.isLoading || sellPreviewQuery.isFetching
                ? '계산 중'
                : formatTierScore(sellPreviewQuery.data?.appliedHighlightScoreDelta ?? 0),
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
        ]}
        summaryNote={`정산 금액은 매도 금액 기준 ${SELL_FEE_RATE_LABEL} 수수료를 반영한 값입니다.`}
        thumbnailUrl={selectedVideoTradeThumbnailUrl}
        title={selectedGameActionTitle}
        unitPointsLabel={formatPoints(selectedVideoUnitPricePoints ?? resolvedSellSummary.settledPoints ?? 0)}
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
