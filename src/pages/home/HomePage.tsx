import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VideoPlayerHandle } from '../../components/VideoPlayer/VideoPlayer';
import AppHeader from './sections/AppHeader';
import { ChartPanel, CommunityPanel } from './sections/ContentPanels';
import GameDividendModal from './sections/GameDividendModal';
import { FilterBar, RegionFilterModal } from './sections/FilterPanels';
import GameRankHistoryModal from './sections/GameRankHistoryModal';
import GameTradeModal from './sections/GameTradeModal';
import PlayerStage from './sections/PlayerStage';
import {
  RankingGameDividendOverview,
  RankingGameHistoryTab,
  RankingGameLeaderboardTab,
  RankingGamePanelShell,
  RankingGamePositionsTab,
  RankingGameSelectedVideoActions,
} from './sections/RankingGamePanel';
import {
  buildOpenGameHoldings,
  calculateEstimatedDividendPoints,
  DEFAULT_GAME_QUANTITY,
  formatHoldCountdown,
  formatPercent,
  formatGameQuantity,
  formatPoints,
  formatRank,
  getBuyShortfallPointsText,
  getPointTone,
  MIN_GAME_QUANTITY,
  normalizeGameQuantity,
  SELL_FEE_RATE_LABEL,
  summarizeGamePositions,
} from './gameHelpers';
import useAppPreferences from './hooks/useAppPreferences';
import useHomePlaybackState from './hooks/useHomePlaybackState';
import useHomeTrendSections from './hooks/useHomeTrendSections';
import useLogoutOnUnauthorized from './hooks/useLogoutOnUnauthorized';
import useSelectedVideoGameState from './hooks/useSelectedVideoGameState';
import {
  DEFAULT_CATEGORY_ID,
  FAVORITE_STREAMER_VIDEO_SECTION,
  GAME_PORTFOLIO_QUEUE_ID,
  HISTORY_PLAYBACK_QUEUE_ID,
  NEW_CHART_ENTRIES_QUEUE_ID,
  REALTIME_SURGING_QUEUE_ID,
  filterVideoSection,
  findPlaybackQueueIdForVideo,
  formatSignedProfitRate,
  getVideoThumbnailUrl,
  mapGamePositionToVideoItem,
  mergeSections,
  scrollElementToViewportCenter,
  sortedCountryCodes,
  type RegionCode,
} from './utils';
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
  useBuyGamePosition,
  useCurrentGameSeason,
  useGameDividendOverview,
  useGameLeaderboard,
  useGameLeaderboardPositions,
  useGameMarket,
  useGamePositionRankHistory,
  useMyGamePositions,
  useSellGamePositions,
} from '../../features/game/queries';
import type { GamePosition } from '../../features/game/types';
import {
  useFavoriteStreamerVideos,
  useFavoriteStreamers,
  useToggleFavoriteStreamer,
} from '../../features/favorites/queries';
import { useVideoRankHistory } from '../../features/trending/queries';
import type { VideoTrendSignal } from '../../features/trending/types';
import { fetchVideoById } from '../../features/youtube/api';
import { usePopularVideosByCategory, useVideoCategories } from '../../features/youtube/queries';
import type { YouTubeVideoItem } from '../../features/youtube/types';
import { ApiRequestError, isApiConfigured } from '../../lib/api';
import '../../styles/app.css';

const COLLAPSED_HOME_SECTIONS_STORAGE_KEY = 'youtube-atlas-collapsed-home-sections';
const MAIN_CHART_SECTION_ID = 'chart-main-list';
const RANKING_GAME_SECTION_ID = 'ranking-game';
type ChartViewMode = 'all' | 'realtime-surging' | 'new-chart-entries' | 'favorites' | 'popular';

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
  const { accessToken, isLoggingOut, logout, status: authStatus, user } = useAuth();
  const [activeGameTab, setActiveGameTab] = useState<'positions' | 'history' | 'leaderboard'>('positions');
  const [isBuyableOnlyFilterActive, setIsBuyableOnlyFilterActive] = useState(false);
  const [collapsedHomeSectionIds, setCollapsedHomeSectionIds] = useState(getInitialCollapsedHomeSectionIds);
  const [gameActionStatus, setGameActionStatus] = useState<string | null>(null);
  const [gameClock, setGameClock] = useState(() => Date.now());
  const [selectedLeaderboardUserId, setSelectedLeaderboardUserId] = useState<number | null>(null);
  const [selectedRankHistoryPosition, setSelectedRankHistoryPosition] = useState<GamePosition | null>(null);
  const [selectedVideoRankHistoryVideoId, setSelectedVideoRankHistoryVideoId] = useState<string | null>(null);
  const [isDividendModalOpen, setIsDividendModalOpen] = useState(false);
  const [activeTradeModal, setActiveTradeModal] = useState<'buy' | 'sell' | null>(null);
  const [activeTradeRequest, setActiveTradeRequest] = useState<'buy' | 'sell' | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(DEFAULT_GAME_QUANTITY);
  const [sellQuantity, setSellQuantity] = useState(DEFAULT_GAME_QUANTITY);
  const [historyPlaybackVideo, setHistoryPlaybackVideo] = useState<YouTubeVideoItem | null>(null);
  const [historyPlaybackLoadingVideoId, setHistoryPlaybackLoadingVideoId] = useState<string | null>(null);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [selectedChartView, setSelectedChartView] = useState<ChartViewMode>('all');
  const playerStageRef = useRef<HTMLDivElement | null>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle | null>(null);
  const playerSectionRef = useRef<HTMLElement | null>(null);
  const playerViewportRef = useRef<HTMLDivElement | null>(null);
  const tradeRequestLockRef = useRef<'buy' | 'sell' | null>(null);
  const {
    cinematicToggleLabel,
    handleToggleCinematicMode,
    handleToggleThemeMode,
    isCinematicModeActive,
    isDarkMode,
    isMobileLayout,
    selectedRegionCode,
    themeToggleDisplayLabel,
    themeToggleLabel,
    updateRegionCode,
  } = useAppPreferences({
    playerSectionRef,
    playerStageRef,
  });

  useEffect(() => {
    persistCollapsedHomeSectionIds(collapsedHomeSectionIds);
  }, [collapsedHomeSectionIds]);

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
  const {
    data: currentGameSeason,
    error: currentGameSeasonError,
    isLoading: isCurrentGameSeasonLoading,
  } = useCurrentGameSeason(accessToken, shouldLoadGame);
  const {
    data: gameMarket = [],
    error: gameMarketError,
    isLoading: isGameMarketLoading,
  } = useGameMarket(accessToken, shouldLoadGame);
  const { data: gameDividendOverview, error: gameDividendOverviewError } = useGameDividendOverview(
    accessToken,
    shouldLoadGame,
  );
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
  } = useGameLeaderboard(accessToken, shouldLoadGame);
  const {
    data: openGamePositions = [],
    error: openGamePositionsError,
  } = useMyGamePositions(accessToken, 'OPEN', shouldLoadGame);
  const {
    data: selectedLeaderboardPositions = [],
    error: selectedLeaderboardPositionsError,
    isError: isSelectedLeaderboardPositionsError,
    isLoading: isSelectedLeaderboardPositionsLoading,
  } = useGameLeaderboardPositions(
    accessToken,
    selectedLeaderboardUserId,
    shouldLoadGame && activeGameTab === 'leaderboard' && selectedLeaderboardUserId !== null,
  );
  const {
    data: gameHistoryPositions = [],
    error: gameHistoryPositionsError,
    isLoading: isGameHistoryLoading,
  } = useMyGamePositions(accessToken, '', shouldLoadGame && activeGameTab === 'history', 30);
  const {
    data: selectedPositionRankHistory,
    error: selectedPositionRankHistoryError,
    isLoading: isPositionRankHistoryLoading,
  } = useGamePositionRankHistory(
    accessToken,
    selectedRankHistoryPosition?.id ?? null,
    shouldLoadGame && Boolean(selectedRankHistoryPosition),
  );
  const {
    evaluationPoints: openPositionsEvaluationPoints,
    profitPoints: openPositionsProfitPoints,
    stakePoints: openPositionsBuyPoints,
  } = useMemo(() => summarizeGamePositions(openGamePositions), [openGamePositions]);
  const computedWalletTotalAssetPoints = currentGameSeason
    ? currentGameSeason.wallet.balancePoints + openPositionsEvaluationPoints
    : null;
  const {
    data: selectedVideoRankHistory,
    error: selectedVideoRankHistoryError,
    isLoading: isVideoRankHistoryLoading,
  } = useVideoRankHistory(
    currentGameSeason?.regionCode ?? VIDEO_GAME_REGION_CODE,
    selectedVideoRankHistoryVideoId ?? undefined,
    isApiConfigured && Boolean(selectedVideoRankHistoryVideoId),
  );
  const buyGamePositionMutation = useBuyGamePosition(accessToken);
  const sellGamePositionsMutation = useSellGamePositions(accessToken);
  const isBuySubmitting = buyGamePositionMutation.isPending || activeTradeRequest === 'buy';
  const isSellSubmitting = sellGamePositionsMutation.isPending || activeTradeRequest === 'sell';

  const {
    data,
    fetchNextPage,
    hasNextPage = false,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = usePopularVideosByCategory(selectedRegionCode, selectedCategory);
  const selectedSection = mergeSections(data?.pages);
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
  const chartViewOptions = [
    { id: 'all', label: '전체' },
    {
      id: 'popular',
      label: 'TOP 200',
    },
    {
      id: 'favorites',
      label: '즐겨찾기',
      disabled: authStatus !== 'authenticated',
    },
    {
      id: 'realtime-surging',
      label: '실시간 급상승',
      disabled: !isTrendRegionSelected,
    },
    {
      id: 'new-chart-entries',
      label: '신규 진입',
      disabled: !isTrendRegionSelected,
    },
  ] satisfies Array<{ id: ChartViewMode; label: string; disabled?: boolean }>;
  const effectiveChartView: ChartViewMode =
    !isTrendRegionSelected &&
    selectedChartView !== 'all' &&
    selectedChartView !== 'favorites' &&
    selectedChartView !== 'popular'
      ? 'all'
      : authStatus !== 'authenticated' && selectedChartView === 'favorites'
        ? 'all'
        : selectedChartView;
  const selectedChartViewOption =
    chartViewOptions.find((option) => option.id === effectiveChartView) ?? chartViewOptions[0];
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

    const buyableVideoIdSet = new Set(
      gameMarket.filter((marketVideo) => marketVideo.canBuy).map((marketVideo) => marketVideo.videoId),
    );

    return filterVideoSection(favoriteChartSection, (item) => buyableVideoIdSet.has(item.id));
  }, [favoriteChartSection, gameMarket, isBuyableOnlyFilterActive]);
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
    () =>
      historyPlaybackVideo
        ? {
            categoryId: HISTORY_PLAYBACK_QUEUE_ID,
            description: '거래내역에서 다시 연 영상입니다.',
            items: [historyPlaybackVideo],
            label: '거래내역 다시 보기',
          }
        : undefined,
    [historyPlaybackVideo],
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
  const {
    canPlayNextVideo,
    handleManualPlaybackSave,
    handlePlaybackRestoreApplied,
    handlePlayNextVideo,
    handlePlayPreviousVideo,
    handleSelectVideo,
    isManualPlaybackSavePending,
    manualPlaybackSaveStatus,
    pendingPlaybackRestore,
    resetForRegionChange,
    resolvedSelectedVideo,
    selectedVideoId,
  } = useHomePlaybackState({
    accessToken,
    authStatus,
    favoriteStreamerVideoSection,
    gamePortfolioSection,
    historyPlaybackSection,
    newChartEntriesSection,
    isMobileLayout,
    logout,
    playerSectionRef,
    playerViewportRef,
    realtimeSurgingSection,
    selectedCategoryId,
    selectedPlaybackSection,
    setSelectedCategoryId,
    sortedVideoCategories,
    user,
    videoPlayerRef,
  });
  const openDistinctVideoCount = new Set(openGamePositions.map((position) => position.videoId)).size;
  const favoriteStreamerVideoErrorMessage =
    favoriteStreamerVideosError instanceof Error
      ? favoriteStreamerVideosError.message
      : '즐겨찾기 영상을 불러오지 못했습니다.';
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
  useLogoutOnUnauthorized(gameDividendOverviewError, logout);
  useLogoutOnUnauthorized(gameMarketError, logout);
  useLogoutOnUnauthorized(openGamePositionsError, logout);
  useLogoutOnUnauthorized(gameHistoryPositionsError, logout);
  useLogoutOnUnauthorized(selectedPositionRankHistoryError, logout);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      return;
    }

    setActiveGameTab('positions');
    setGameActionStatus(null);
    setSelectedRankHistoryPosition(null);
    setSelectedVideoRankHistoryVideoId(null);
    setHistoryPlaybackLoadingVideoId(null);
    setHistoryPlaybackVideo(null);
  }, [authStatus]);

  useEffect(() => {
    if (isBuyableOnlyFilterAvailable) {
      return;
    }

    setIsBuyableOnlyFilterActive(false);
  }, [isBuyableOnlyFilterAvailable]);

  useEffect(() => {
    setBuyQuantity(1);
    setSellQuantity(1);
    setActiveTradeModal(null);
  }, [selectedVideoId]);

  useEffect(() => {
    if (!shouldAutoPrefetchBuyableVideos) {
      return;
    }

    void fetchNextPage();
  }, [fetchNextPage, shouldAutoPrefetchBuyableVideos]);

  useEffect(() => {
    setGameActionStatus(null);
  }, [selectedVideoId]);

  useEffect(() => {
    if (selectedChartView === 'favorites' && authStatus !== 'authenticated') {
      setSelectedChartView('all');
      return;
    }

    if (
      isTrendRegionSelected ||
      selectedChartView === 'all' ||
      selectedChartView === 'favorites' ||
      selectedChartView === 'popular'
    ) {
      return;
    }

    setSelectedChartView('all');
  }, [authStatus, isTrendRegionSelected, selectedChartView]);

  useEffect(() => {
    if (openGamePositions.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setGameClock(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [openGamePositions.length]);

  function handleSelectRegion(regionCode: RegionCode) {
    resetForRegionChange();
    setSelectedCategoryId(DEFAULT_CATEGORY_ID);
    updateRegionCode(regionCode);
    setIsRegionModalOpen(false);
  }

  function handleSelectChartView(viewId: string, triggerElement?: HTMLButtonElement) {
    const nextView = chartViewOptions.find((option) => option.id === viewId);

    if (!nextView || nextView.disabled) {
      triggerElement?.blur();
      return;
    }

    const nextSectionIds = chartViewExpandedSectionIds[nextView.id] ?? [];

    if (nextSectionIds.length > 0) {
      setCollapsedHomeSectionIds((currentSectionIds) =>
        currentSectionIds.filter((currentSectionId) => !nextSectionIds.includes(currentSectionId)),
      );
    }

    setSelectedChartView(nextView.id);
    triggerElement?.blur();
  }

  const getRemainingHoldSeconds = useCallback(
    (position: GamePosition) => {
      if (!currentGameSeason) {
        return 0;
      }

      const elapsedSeconds = Math.floor((gameClock - new Date(position.createdAt).getTime()) / 1000);

      return Math.max(0, currentGameSeason.minHoldSeconds - elapsedSeconds);
    },
    [currentGameSeason, gameClock],
  );
  const openGameHoldings = useMemo(
    () => buildOpenGameHoldings(openGamePositions, getRemainingHoldSeconds),
    [getRemainingHoldSeconds, openGamePositions],
  );
  const {
    buyActionTitle,
    buyModalHelperText,
    currentVideoGameHelperText,
    favoriteToggleHelperText,
    favoriteToggleLabel,
    gameSeasonRegionMismatch,
    isChartActionDisabled,
    isCurrentVideoGameHelperWarning,
    isSelectedChannelFavorited,
    isSelectedVideoBuyDisabled,
    isSelectedVideoSellDisabled,
    maxBuyQuantity,
    maxSellQuantity,
    normalizedBuyQuantity,
    normalizedSellQuantity,
    selectedChannelId,
    selectedGameActionTitle,
    selectedVideoCurrentChartRank,
    selectedVideoHistoryTargetPosition,
    selectedVideoIsChartOut,
    selectedVideoMarketEntry,
    selectedVideoOpenPositionCount,
    selectedVideoOpenPositionSummary,
    selectedVideoPriceLabel,
    selectedVideoRankLabel,
    selectedVideoRankTrendIndicator,
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
    isBuySubmitting,
    isCurrentGameSeasonLoading,
    isFavoriteTogglePending: toggleFavoriteStreamerMutation.isPending,
    openGameHoldings,
    openGamePositions,
    resolvedSelectedVideo,
    selectedCategoryId,
    selectedCategoryLabel: selectedChartViewOption.label,
    selectedCountryName,
    selectedRegionCode,
    selectedVideoId,
    selectedVideoRankSignalById: chartTrendSignalsByVideoId,
    sellQuantity,
  });

  useEffect(() => {
    setBuyQuantity((currentQuantity) => {
      if (maxBuyQuantity <= 0) {
        return DEFAULT_GAME_QUANTITY;
      }

      return Math.min(normalizeGameQuantity(currentQuantity), maxBuyQuantity);
    });
  }, [maxBuyQuantity]);

  useEffect(() => {
    setSellQuantity((currentQuantity) => {
      if (maxSellQuantity <= 0) {
        return DEFAULT_GAME_QUANTITY;
      }

      return Math.min(normalizeGameQuantity(currentQuantity), maxSellQuantity);
    });
  }, [maxSellQuantity]);

  const handleBuyCurrentVideo = useCallback(async () => {
    if (tradeRequestLockRef.current) {
      return;
    }

    if (authStatus !== 'authenticated' || !selectedVideoId) {
      setGameActionStatus('로그인 후 지금 보는 영상을 매수할 수 있습니다.');
      return;
    }

    if (!currentGameSeason) {
      setGameActionStatus(
        currentGameSeasonError instanceof Error
          ? currentGameSeasonError.message
          : '지금은 게임 시즌을 불러올 수 없습니다.',
      );
      return;
    }

    if (!selectedVideoMarketEntry) {
      setGameActionStatus(
        gameSeasonRegionMismatch
          ? `현재 게임은 ${currentGameSeason.regionCode} 시즌 기준으로 진행 중입니다.`
          : '현재 영상은 아직 게임 거래 대상이 아닙니다.',
      );
      return;
    }

    const clampedBuyQuantity = normalizeGameQuantity(buyQuantity);
    const buyShortfallMessage = getBuyShortfallPointsText(
      currentGameSeason,
      selectedVideoMarketEntry,
      clampedBuyQuantity,
    );

    if (!selectedVideoMarketEntry.canBuy) {
      setGameActionStatus(
        buyShortfallMessage ?? selectedVideoMarketEntry.buyBlockedReason ?? '지금은 매수할 수 없습니다.',
      );
      return;
    }

    if (maxBuyQuantity <= 0 || clampedBuyQuantity > maxBuyQuantity) {
      setGameActionStatus(
        maxBuyQuantity > 0
          ? `지금은 최대 ${formatGameQuantity(maxBuyQuantity)}까지 한 번에 매수할 수 있습니다.`
          : buyShortfallMessage ?? '지금은 매수할 수 없습니다.',
      );
      return;
    }

    try {
      tradeRequestLockRef.current = 'buy';
      setActiveTradeRequest('buy');
      await buyGamePositionMutation.mutateAsync({
        categoryId: '0',
        regionCode: currentGameSeason.regionCode,
        stakePoints: selectedVideoMarketEntry.currentPricePoints,
        quantity: clampedBuyQuantity,
        videoId: selectedVideoId,
      });
      setActiveTradeModal(null);
      setBuyQuantity(DEFAULT_GAME_QUANTITY);
      setGameActionStatus(
        `${formatPoints(totalSelectedVideoBuyPoints ?? selectedVideoMarketEntry.currentPricePoints)}로 ${
          selectedVideoMarketEntry.currentRank
        }위 영상을 ${formatGameQuantity(clampedBuyQuantity)} 매수했어요.`,
      );
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.code === 'unauthorized' || error.code === 'session_expired')
      ) {
        void logout();
        return;
      }

      setGameActionStatus(
        error instanceof Error ? error.message : '매수에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      tradeRequestLockRef.current = null;
      setActiveTradeRequest(null);
    }
  }, [
    authStatus,
    buyQuantity,
    buyGamePositionMutation,
    currentGameSeason,
    currentGameSeasonError,
    gameSeasonRegionMismatch,
    logout,
    maxBuyQuantity,
    selectedVideoId,
    selectedVideoMarketEntry,
    totalSelectedVideoBuyPoints,
  ]);
  const handleSellCurrentVideo = useCallback(async () => {
    if (tradeRequestLockRef.current) {
      return;
    }

    if (authStatus !== 'authenticated' || !selectedVideoId) {
      setGameActionStatus('로그인 후 보유 포지션을 매도할 수 있습니다.');
      return;
    }

    const clampedSellQuantity = normalizeGameQuantity(sellQuantity);

    if (maxSellQuantity <= 0 || clampedSellQuantity > maxSellQuantity) {
      setGameActionStatus(
        maxSellQuantity > 0
          ? `지금은 최대 ${formatGameQuantity(maxSellQuantity)}까지 매도할 수 있습니다.`
          : '지금 바로 매도 가능한 포지션이 없습니다.',
      );
      return;
    }

    try {
      tradeRequestLockRef.current = 'sell';
      setActiveTradeRequest('sell');
      const soldPositions = await sellGamePositionsMutation.mutateAsync({
        quantity: clampedSellQuantity,
        videoId: selectedVideoId,
      });
      const totalSettledPoints = soldPositions.reduce(
        (sum, response) => sum + response.settledPoints,
        0,
      );
      const totalSellPricePoints = soldPositions.reduce(
        (sum, response) => sum + response.sellPricePoints,
        0,
      );
      const totalPnlPoints = soldPositions.reduce(
        (sum, response) => sum + response.pnlPoints,
        0,
      );
      const totalStakePoints = soldPositions.reduce(
        (sum, response) => sum + response.stakePoints,
        0,
      );
      const totalSoldQuantity = soldPositions.reduce(
        (sum, response) => sum + response.quantity,
        0,
      );
      const totalFeePoints = totalSellPricePoints - totalSettledPoints;

      setActiveTradeModal(null);
      setSellQuantity(DEFAULT_GAME_QUANTITY);
      setGameActionStatus(
        `${selectedGameActionTitle} 포지션 ${formatGameQuantity(totalSoldQuantity)}를 정산 ${formatPoints(totalSettledPoints)} / 수수료 ${formatPoints(totalFeePoints)} / 손익률 ${formatSignedProfitRate(
          totalPnlPoints,
          totalStakePoints,
        )} 기준으로 정리했어요.`,
      );
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.code === 'unauthorized' || error.code === 'session_expired')
      ) {
        void logout();
        return;
      }

      setGameActionStatus(
        error instanceof Error ? error.message : '일괄 매도에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      tradeRequestLockRef.current = null;
      setActiveTradeRequest(null);
    }
  }, [
    authStatus,
    logout,
    maxSellQuantity,
    selectedGameActionTitle,
    selectedVideoId,
    sellGamePositionsMutation,
    sellQuantity,
  ]);

  const openBuyTradeModal = useCallback(() => {
    setBuyQuantity((currentQuantity) => {
      if (maxBuyQuantity <= 0) {
        return DEFAULT_GAME_QUANTITY;
      }

      return Math.min(normalizeGameQuantity(currentQuantity), maxBuyQuantity);
    });
    setActiveTradeModal('buy');
  }, [maxBuyQuantity]);

  const openSellTradeModal = useCallback(() => {
    setSellQuantity((currentQuantity) => {
      if (maxSellQuantity <= 0) {
        return DEFAULT_GAME_QUANTITY;
      }

      return Math.min(normalizeGameQuantity(currentQuantity), maxSellQuantity);
    });
    setActiveTradeModal('sell');
  }, [maxSellQuantity]);

  const openSelectedVideoRankHistory = useCallback(() => {
    if (!selectedVideoId) {
      return;
    }

    if (selectedVideoHistoryTargetPosition) {
      setSelectedVideoRankHistoryVideoId(null);
      setSelectedRankHistoryPosition(selectedVideoHistoryTargetPosition);
      return;
    }

    setSelectedRankHistoryPosition(null);
    setSelectedVideoRankHistoryVideoId(selectedVideoId);
  }, [selectedVideoHistoryTargetPosition, selectedVideoId]);

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

  const scrollToPlayerStage = useCallback(() => {
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
  }, [isMobileLayout]);

  const handleSelectGamePositionVideo = useCallback(
    (videoId: string) => {
      scrollToPlayerStage();
      handleSelectVideo(videoId, gamePortfolioSection.categoryId);
    },
    [gamePortfolioSection.categoryId, handleSelectVideo, scrollToPlayerStage],
  );
  const handleSelectGameHistoryVideo = useCallback(
    async (position: GamePosition, playbackQueueId?: string) => {
      scrollToPlayerStage();

      if (playbackQueueId) {
        setGameActionStatus(null);
        handleSelectVideo(position.videoId, playbackQueueId);
        return;
      }

      setHistoryPlaybackLoadingVideoId(position.videoId);

      try {
        const video = await fetchVideoById(position.videoId);
        setHistoryPlaybackVideo(video);
        setGameActionStatus(null);
        handleSelectVideo(video.id, HISTORY_PLAYBACK_QUEUE_ID);
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
    [handleSelectVideo, scrollToPlayerStage],
  );
  const handleSelectLeaderboardPositionVideo = useCallback(
    async (position: GamePosition, playbackQueueId?: string) => {
      scrollToPlayerStage();

      if (playbackQueueId) {
        setGameActionStatus(null);
        handleSelectVideo(position.videoId, playbackQueueId);
        return;
      }

      setHistoryPlaybackLoadingVideoId(position.videoId);

      try {
        const video = await fetchVideoById(position.videoId);
        setHistoryPlaybackVideo(video);
        setGameActionStatus(null);
        handleSelectVideo(video.id, HISTORY_PLAYBACK_QUEUE_ID);
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
    [handleSelectVideo, scrollToPlayerStage],
  );
  const currentVideoGamePriceSummary = selectedVideoOpenPositionCount > 0 ? (
    <div className="app-shell__game-panel-actions-summary" aria-label="선택한 영상 가격 정보">
      <p className="app-shell__game-panel-actions-summary-line">
        현재{' '}
        {formatRank(selectedVideoCurrentChartRank, {
          chartOut: selectedVideoIsChartOut,
        })}
        {selectedVideoTrendBadges.length > 0 ? (
          <span className="app-shell__game-panel-actions-trends">
            {selectedVideoTrendBadges.map((badge) => (
              <span
                key={`${badge.tone}-${badge.label}`}
                className="app-shell__game-panel-actions-trend"
                data-tone={badge.tone}
              >
                {badge.label}
              </span>
            ))}
          </span>
        ) : null}{' '}
        · 보유 {formatGameQuantity(selectedVideoOpenPositionSummary.quantity)} · 손익률{' '}
        <span data-tone={getPointTone(selectedVideoOpenPositionSummary.profitPoints)}>
          {formatSignedProfitRate(
            selectedVideoOpenPositionSummary.profitPoints,
            selectedVideoOpenPositionSummary.stakePoints,
          )}
        </span>
      </p>
      <p className="app-shell__game-panel-actions-summary-line">
        총 매수 {formatPoints(selectedVideoOpenPositionSummary.stakePoints)} · 총 평가{' '}
        {formatPoints(selectedVideoOpenPositionSummary.evaluationPoints)}
      </p>
      {selectedVideoId && gameDividendOverview ? (
        <p className="app-shell__game-panel-actions-summary-line">
          {(() => {
            const selectedRank = selectedVideoCurrentChartRank;
            const matchingRank = gameDividendOverview.ranks.find((rank) => rank.rank === selectedRank);
            const positionEstimatedDividendPoints = gameDividendOverview.positions
              .filter((position) => position.videoId === selectedVideoId && position.holdEligible)
              .reduce((sum, position) => sum + position.estimatedDividendPoints, 0);
            const warmingUpPosition = gameDividendOverview.positions.find(
              (position) => position.videoId === selectedVideoId && !position.holdEligible,
            );

            if (!matchingRank) {
              return `20위 안에 들면 배당 구간에 들어갑니다.`;
            }

            if (positionEstimatedDividendPoints > 0) {
              return `배당 대상 ${matchingRank.rank}위 · 예상 배당 ${formatPoints(positionEstimatedDividendPoints)} · 배당률 ${formatPercent(matchingRank.dividendRatePercent)}`;
            }

            if (typeof warmingUpPosition?.nextEligibleInSeconds === 'number') {
              return `배당 대상 ${matchingRank.rank}위 · ${formatHoldCountdown(warmingUpPosition.nextEligibleInSeconds)} 뒤 배당 반영 · 배당률 ${formatPercent(matchingRank.dividendRatePercent)}`;
            }

            return `배당 대상 ${matchingRank.rank}위 · 배당률 ${formatPercent(matchingRank.dividendRatePercent)}`;
          })()}
        </p>
      ) : null}
    </div>
  ) : selectedVideoMarketEntry ? (
    <div className="app-shell__game-panel-actions-summary" aria-label="선택한 영상 현재 가격">
      <p className="app-shell__game-panel-actions-summary-line">
        현재 {formatRank(selectedVideoMarketEntry.currentRank)}
        {selectedVideoTrendBadges.length > 0 ? (
          <span className="app-shell__game-panel-actions-trends">
            {selectedVideoTrendBadges.map((badge) => (
              <span
                key={`${badge.tone}-${badge.label}`}
                className="app-shell__game-panel-actions-trend"
                data-tone={badge.tone}
              >
                {badge.label}
              </span>
            ))}
          </span>
        ) : null}{' '}
        · 가격 {formatPoints(selectedVideoMarketEntry.currentPricePoints)}
      </p>
      {gameDividendOverview ? (
        <p className="app-shell__game-panel-actions-summary-line">
          {(() => {
            const matchingRank = gameDividendOverview.ranks.find(
              (rank) => rank.rank === selectedVideoMarketEntry.currentRank,
            );

            if (!matchingRank) {
              return `20위 안 진입 시 배당 구간에 들어갑니다.`;
            }

            const estimatedDividendPoints = calculateEstimatedDividendPoints(
              selectedVideoMarketEntry.currentPricePoints,
              matchingRank.dividendRatePercent,
            );

            return `배당 대상 ${matchingRank.rank}위 · 예상 배당 ${formatPoints(estimatedDividendPoints ?? 0)} · 배당률 ${formatPercent(matchingRank.dividendRatePercent)}`;
          })()}
        </p>
      ) : null}
    </div>
  ) : null;
  const gameActionContent = selectedVideoId ? (
    <>
      <button
        aria-label="선택한 영상 차트"
        className="app-shell__stage-action-button app-shell__stage-action-button--game"
        data-variant="chart"
        disabled={!canShowGameActions}
        onClick={openSelectedVideoRankHistory}
        title={
          !canShowGameActions
            ? '전체 카테고리에서만 차트를 볼 수 있습니다.'
            : '선택한 영상의 랭킹 차트를 엽니다.'
        }
        type="button"
      >
        <span className="app-shell__stage-action-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M5.75 17.25 10 12.5l2.75 2.75 5.5-6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path
              d="M15.5 9.25H18.5v3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </span>
      </button>
      <button
        aria-label="선택한 영상 매수"
        className="app-shell__stage-action-button app-shell__stage-action-button--game"
        data-variant="buy"
        disabled={!canShowGameActions || isSelectedVideoBuyDisabled}
        onClick={openBuyTradeModal}
        title={!canShowGameActions ? '전체 카테고리에서만 매수할 수 있습니다.' : buyActionTitle}
        type="button"
      >
        <span className="app-shell__stage-action-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 18V6M12 6l-4 4M12 6l4 4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </span>
      </button>
      {selectedVideoOpenPositionCount > 0 ? (
        <button
          aria-label="선택한 영상 매도"
          className="app-shell__stage-action-button app-shell__stage-action-button--game"
          data-variant="sell"
          disabled={isSelectedVideoSellDisabled}
          onClick={openSellTradeModal}
          title={sellActionTitle}
          type="button"
        >
          <span className="app-shell__stage-action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 6v12M12 18l-4-4M12 18l4-4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
        </button>
      ) : null}
    </>
  ) : null;
  const selectedLeaderboardEntry = selectedLeaderboardUserId
    ? gameLeaderboard.find((entry) => entry.userId === selectedLeaderboardUserId) ?? null
    : null;
  const selectedLeaderboardPositionsTitle = selectedLeaderboardEntry
    ? `${selectedLeaderboardEntry.displayName}님의 보유 포지션`
    : '보유 포지션';
  const rankingGameHelperText = currentGameSeason
    ? currentVideoGameHelperText
    : isCurrentGameSeasonLoading
      ? '게임 시즌을 불러오는 중입니다.'
      : currentGameSeasonError instanceof Error
        ? currentGameSeasonError.message
        : '다음 게임 시즌을 준비 중입니다.';
  const positionsEmptyMessage = currentGameSeason
    ? canShowGameActions
      ? '아직 보유 중인 영상이 없어요. 지금 보는 영상에서 바로 시작할 수 있습니다.'
      : '새 포지션 매수와 기존 포지션 매도는 전체 카테고리에서만 가능합니다.'
    : null;
  const historyEmptyMessage = currentGameSeason ? '아직 현재 시즌 거래내역이 없습니다.' : null;
  const resolveHistoryPlaybackQueueId = useCallback(
    (videoId: string) =>
      findPlaybackQueueIdForVideo(videoId, {
        favoriteStreamerVideoSection,
        gamePortfolioSection,
        historyPlaybackSection,
        newChartEntriesSection,
        realtimeSurgingSection,
        selectedSection: selectedPlaybackSection,
      }),
    [
      favoriteStreamerVideoSection,
      gamePortfolioSection,
      historyPlaybackSection,
      newChartEntriesSection,
      realtimeSurgingSection,
      selectedPlaybackSection,
    ],
  );
  const resolveLeaderboardPlaybackQueueId = useCallback(
    (videoId: string) =>
      findPlaybackQueueIdForVideo(videoId, {
        favoriteStreamerVideoSection,
        gamePortfolioSection,
        historyPlaybackSection,
        newChartEntriesSection,
        realtimeSurgingSection,
        selectedSection: selectedPlaybackSection,
      }),
    [
      favoriteStreamerVideoSection,
      gamePortfolioSection,
      historyPlaybackSection,
      newChartEntriesSection,
      realtimeSurgingSection,
      selectedPlaybackSection,
    ],
  );
  const leaderboardContent = (
    <RankingGameLeaderboardTab
      entries={gameLeaderboard}
      error={gameLeaderboardError}
      isError={isGameLeaderboardError}
      isLoading={isGameLeaderboardLoading}
      isPositionsError={isSelectedLeaderboardPositionsError}
      isPositionsLoading={isSelectedLeaderboardPositionsLoading}
      loadingVideoId={historyPlaybackLoadingVideoId}
      onSelectPosition={(position, playbackQueueId) => {
        void handleSelectLeaderboardPositionVideo(position, playbackQueueId);
      }}
      onToggleUser={(userId) =>
        setSelectedLeaderboardUserId((currentUserId) => (currentUserId === userId ? null : userId))
      }
      positions={selectedLeaderboardPositions}
      positionsError={selectedLeaderboardPositionsError}
      positionsTitle={selectedLeaderboardPositionsTitle}
      resolvePlaybackQueueId={resolveLeaderboardPlaybackQueueId}
      season={currentGameSeason}
      selectedUserId={selectedLeaderboardUserId}
    />
  );
  const positionsContent = (
    <RankingGamePositionsTab
      canShowGameActions={canShowGameActions}
      emptyMessage={positionsEmptyMessage}
      favoriteTrendSignalsByVideoId={favoriteTrendSignalsByVideoId}
      gameMarketSignalsByVideoId={gameMarketSignalsByVideoId}
      holdings={openGameHoldings}
      onSelectVideo={handleSelectGamePositionVideo}
      selectedVideoId={selectedVideoId}
      trendSignalsByVideoId={chartTrendSignalsByVideoId}
    />
  );
  const historyContent = (
    <RankingGameHistoryTab
      emptyMessage={historyEmptyMessage}
      historyPlaybackLoadingVideoId={historyPlaybackLoadingVideoId}
      isLoading={isGameHistoryLoading}
      onSelectPosition={(position, playbackQueueId) => {
        void handleSelectGameHistoryVideo(position, playbackQueueId);
      }}
      positions={gameHistoryPositions}
      resolvePlaybackQueueId={resolveHistoryPlaybackQueueId}
      selectedVideoId={selectedVideoId}
    />
  );
  const selectedVideoActionsContent = selectedVideoId ? (
    <RankingGameSelectedVideoActions
      buyActionTitle={buyActionTitle}
      canShowGameActions={canShowGameActions}
      currentVideoGamePriceSummary={currentVideoGamePriceSummary}
      isBuyDisabled={isSelectedVideoBuyDisabled}
      isBuySubmitting={isBuySubmitting}
      isChartDisabled={isChartActionDisabled}
      isSellDisabled={isSelectedVideoSellDisabled}
      isSellSubmitting={isSellSubmitting}
      onOpenBuyTradeModal={openBuyTradeModal}
      onOpenRankHistory={openSelectedVideoRankHistory}
      onOpenSellTradeModal={openSellTradeModal}
      selectedGameActionTitle={selectedGameActionTitle}
      selectedVideoOpenPositionCount={selectedVideoOpenPositionCount}
      selectedVideoTradeThumbnailUrl={selectedVideoTradeThumbnailUrl}
      sellActionTitle={sellActionTitle}
    />
  ) : null;
  const activeGameTabContent =
    activeGameTab === 'positions'
      ? positionsContent
      : activeGameTab === 'history'
        ? historyContent
        : leaderboardContent;
  const portfolioContent =
    isAllCategorySelected && isApiConfigured && authStatus === 'authenticated' ? (
      <RankingGamePanelShell
        activeGameTab={activeGameTab}
        dividendOverview={
          <RankingGameDividendOverview
            onOpenDetails={() => setIsDividendModalOpen(true)}
            overview={gameDividendOverview}
            season={currentGameSeason}
          />
        }
        helperText={rankingGameHelperText}
        isCollapsed={isRankingGameCollapsed}
        isHelperWarning={isCurrentVideoGameHelperWarning}
        onSelectTab={setActiveGameTab}
        onToggleCollapse={() => toggleCollapsedSection(RANKING_GAME_SECTION_ID)}
        season={currentGameSeason}
        selectedVideoActions={selectedVideoActionsContent}
        statusMessage={gameActionStatus}
        summary={{
          computedWalletTotalAssetPoints,
          openDistinctVideoCount,
          openPositionsBuyPoints,
          openPositionsEvaluationPoints,
          openPositionsProfitPoints,
        }}
        tabContent={activeGameTabContent}
      />
    ) : null;
  const realtimeSurgingFeaturedSection = featuredChartSections.find(
    (featuredSection) => featuredSection.section.categoryId === REALTIME_SURGING_QUEUE_ID,
  );
  const newChartEntriesFeaturedSection = featuredChartSections.find(
    (featuredSection) => featuredSection.section.categoryId === NEW_CHART_ENTRIES_QUEUE_ID,
  );
  const favoriteChartGetRankLabel = useCallback(
    (item: YouTubeVideoItem) => {
      const signal = favoriteTrendSignalsByVideoId[item.id];

      if (signal?.currentRank) {
        return `${signal.currentRank}위`;
      }

      return hasResolvedFavoriteTrendSignals ? '현재 순위 미집계' : '현재 순위 확인 중';
    },
    [favoriteTrendSignalsByVideoId, hasResolvedFavoriteTrendSignals],
  );
  const popularChartGetRankLabel = useCallback(
    (item: YouTubeVideoItem) => {
      const signal = chartTrendSignalsByVideoId[item.id];

      if (signal?.currentRank) {
        return `${signal.currentRank}위`;
      }

      return hasResolvedChartTrendSignals ? '현재 순위 미집계' : '현재 순위 확인 중';
    },
    [chartTrendSignalsByVideoId, hasResolvedChartTrendSignals],
  );
  const favoriteFeaturedSection =
    authStatus === 'authenticated' && buyableFavoriteChartSection
      ? {
          section: buyableFavoriteChartSection,
          eyebrow: 'Favorite Videos',
          emptyMessage:
            favoriteStreamers.length === 0
              ? '저장한 채널이 생기면 해당 채널의 인기 영상을 여기에서 바로 볼 수 있습니다.'
              : isBuyableOnlyFilterActive
                ? '지금 매수 가능한 즐겨찾기 영상이 없습니다. 필터를 해제하거나 다른 보기를 확인해 보세요.'
              : undefined,
          getRankLabel: favoriteChartGetRankLabel,
        }
      : undefined;
  const activeChartSection =
    effectiveChartView === 'realtime-surging'
        ? realtimeSurgingFeaturedSection?.section
      : effectiveChartView === 'new-chart-entries'
        ? newChartEntriesFeaturedSection?.section
        : effectiveChartView === 'favorites'
          ? buyableFavoriteChartSection
          : effectiveChartView === 'popular'
            ? filteredSelectedPlaybackSection
        : filteredSelectedPlaybackSection;
  const activeChartFeaturedSections: typeof featuredChartSections =
    effectiveChartView === 'all'
      ? favoriteFeaturedSection
        ? [...featuredChartSections, favoriteFeaturedSection]
        : featuredChartSections
      : [];
  const activeChartSectionEyebrow =
    effectiveChartView === 'realtime-surging'
      ? realtimeSurgingFeaturedSection?.eyebrow
      : effectiveChartView === 'new-chart-entries'
        ? newChartEntriesFeaturedSection?.eyebrow
        : effectiveChartView === 'favorites'
          ? 'Favorite Videos'
          : effectiveChartView === 'popular'
            ? 'Popular Videos'
        : 'Category Ranking';
  const activeChartRankLabel =
    effectiveChartView === 'realtime-surging'
      ? realtimeSurgingFeaturedSection?.getRankLabel
      : effectiveChartView === 'new-chart-entries'
        ? newChartEntriesFeaturedSection?.getRankLabel
        : effectiveChartView === 'favorites'
          ? favoriteChartGetRankLabel
          : effectiveChartView === 'popular'
            ? popularChartGetRankLabel
        : undefined;
  const activeChartEmptyMessage =
    effectiveChartView === 'realtime-surging'
      ? realtimeSurgingFeaturedSection?.emptyMessage
      : effectiveChartView === 'new-chart-entries'
        ? newChartEntriesFeaturedSection?.emptyMessage
        : effectiveChartView === 'favorites'
          ? favoriteStreamers.length === 0
            ? '저장한 채널이 생기면 해당 채널의 인기 영상을 여기에서 바로 볼 수 있습니다.'
            : isBuyableOnlyFilterActive
              ? '지금 매수 가능한 즐겨찾기 영상이 없습니다. 필터를 해제하거나 다른 보기를 확인해 보세요.'
            : undefined
        : undefined;
  const isTrendOnlyViewSelected = effectiveChartView !== 'all';
  const activeTrendViewIsLoading =
    effectiveChartView === 'realtime-surging'
      ? isRealtimeSurgingLoading
      : effectiveChartView === 'new-chart-entries'
        ? isNewChartEntriesLoading
        : effectiveChartView === 'favorites'
          ? isFavoriteStreamersLoading || isFavoriteStreamerVideosLoading
        : false;
  const activeTrendViewIsError =
    effectiveChartView === 'realtime-surging'
      ? isRealtimeSurgingError
      : effectiveChartView === 'new-chart-entries'
        ? isNewChartEntriesError
        : effectiveChartView === 'favorites'
          ? isFavoriteStreamersError || isFavoriteStreamerVideosError
        : false;
  const activeChartIsLoading =
    effectiveChartView === 'favorites'
      ? activeTrendViewIsLoading
      : isTrendOnlyViewSelected
        ? isChartLoading || activeTrendViewIsLoading
        : isChartLoading;
  const activeChartIsError =
    effectiveChartView === 'favorites'
      ? activeTrendViewIsError
      : isTrendOnlyViewSelected
        ? isChartError || activeTrendViewIsError
        : isChartError;
  const activeChartErrorMessage =
    effectiveChartView === 'favorites'
      ? isFavoriteStreamersError
        ? '즐겨찾기 채널을 불러오지 못했습니다.'
        : favoriteStreamerVideoErrorMessage
      : activeTrendViewIsError && !chartErrorMessage
        ? '선택한 차트 보기를 불러오지 못했습니다.'
        : chartErrorMessage;
  const activeChartHasNextPage =
    effectiveChartView === 'favorites'
      ? hasNextFavoriteStreamerVideosPage
      : effectiveChartView === 'realtime-surging' || effectiveChartView === 'new-chart-entries'
        ? false
        : hasNextPage;
  const activeChartMainSectionCollapseKey = isTrendOnlyViewSelected
    ? activeChartSection?.categoryId
    : MAIN_CHART_SECTION_ID;
  const activeChartHasResolvedTrendSignals =
    effectiveChartView === 'favorites' ? hasResolvedFavoriteTrendSignals : hasResolvedChartTrendSignals;
  const activeChartIsFetchingNextPage =
    effectiveChartView === 'favorites' ? isFetchingNextFavoriteStreamerVideosPage : isFetchingNextPage;
  const activeChartTrendSignalsByVideoId =
    effectiveChartView === 'favorites' ? favoriteTrendSignalsByVideoId : chartTrendSignalsByVideoId;
  const activeChartOnLoadMore =
    effectiveChartView === 'favorites'
      ? () => void fetchNextFavoriteStreamerVideosPage()
      : () => void fetchNextPage();
  const activeChartBuyableOnlyFilterAvailable = isBuyableOnlyFilterAvailable;
  const activeChartBuyableOnlyFilterActive = isBuyableOnlyFilterActive;
  const activeChartBuyableVideoSearchStatus = buyableVideoSearchStatus;
  const chartViewExpandedSectionIds: Partial<Record<ChartViewMode, string[]>> = {
    all: [
      MAIN_CHART_SECTION_ID,
      ...featuredChartSections.map(({ section }) => section.categoryId),
      ...(favoriteFeaturedSection ? [favoriteFeaturedSection.section.categoryId] : []),
    ],
    favorites: buyableFavoriteChartSection?.categoryId ? [buyableFavoriteChartSection.categoryId] : [],
    'new-chart-entries': newChartEntriesFeaturedSection?.section.categoryId
      ? [newChartEntriesFeaturedSection.section.categoryId]
      : [],
    popular: filteredSelectedPlaybackSection?.categoryId ? [filteredSelectedPlaybackSection.categoryId] : [],
    'realtime-surging': realtimeSurgingFeaturedSection?.section.categoryId
      ? [realtimeSurgingFeaturedSection.section.categoryId]
      : [],
  };

  const chartContent = (
    <ChartPanel
      getRankLabel={activeChartRankLabel}
      buyableVideoSearchStatus={activeChartBuyableVideoSearchStatus}
      chartErrorMessage={activeChartErrorMessage}
      featuredSections={activeChartFeaturedSections}
      collapsedFeaturedSectionIds={collapsedFeaturedSectionIds}
      hasNextPage={activeChartHasNextPage}
      hasResolvedTrendSignals={activeChartHasResolvedTrendSignals}
      isBuyableOnlyFilterActive={activeChartBuyableOnlyFilterActive}
      isBuyableOnlyFilterAvailable={activeChartBuyableOnlyFilterAvailable}
      isChartError={activeChartIsError}
      isChartLoading={activeChartIsLoading}
      isFetchingNextPage={activeChartIsFetchingNextPage}
      mainSectionCollapseKey={activeChartMainSectionCollapseKey}
      onLoadMore={activeChartOnLoadMore}
      onToggleFeaturedSectionCollapse={toggleCollapsedSection}
      onToggleBuyableOnlyFilter={() => setIsBuyableOnlyFilterActive((current) => !current)}
      onSelectVideo={handleSelectVideo}
      primarySectionEyebrow={activeChartSectionEyebrow}
      section={activeChartSection}
      sectionEmptyMessage={activeChartEmptyMessage}
      selectedCategoryLabel={selectedChartViewOption.label}
      selectedCountryName={selectedCountryName}
      selectedVideoId={selectedVideoId}
      trendSignalsByVideoId={activeChartTrendSignalsByVideoId}
    />
  );

  const cinematicChartContent = (
    <ChartPanel
      getRankLabel={activeChartRankLabel}
      buyableVideoSearchStatus={activeChartBuyableVideoSearchStatus}
      chartErrorMessage={activeChartErrorMessage}
      className="app-shell__panel--chart-cinematic"
      featuredSections={activeChartFeaturedSections}
      collapsedFeaturedSectionIds={collapsedFeaturedSectionIds}
      hasNextPage={activeChartHasNextPage}
      hasResolvedTrendSignals={activeChartHasResolvedTrendSignals}
      isBuyableOnlyFilterActive={activeChartBuyableOnlyFilterActive}
      isBuyableOnlyFilterAvailable={activeChartBuyableOnlyFilterAvailable}
      isChartError={activeChartIsError}
      isChartLoading={activeChartIsLoading}
      isFetchingNextPage={activeChartIsFetchingNextPage}
      mainSectionCollapseKey={activeChartMainSectionCollapseKey}
      onLoadMore={activeChartOnLoadMore}
      onToggleFeaturedSectionCollapse={toggleCollapsedSection}
      onToggleBuyableOnlyFilter={() => setIsBuyableOnlyFilterActive((current) => !current)}
      onSelectVideo={handleSelectVideo}
      primarySectionEyebrow={activeChartSectionEyebrow}
      section={activeChartSection}
      sectionEmptyMessage={activeChartEmptyMessage}
      selectedCategoryLabel={selectedChartViewOption.label}
      selectedCountryName={selectedCountryName}
      selectedVideoId={selectedVideoId}
      trendSignalsByVideoId={activeChartTrendSignalsByVideoId}
    />
  );
  const filterContent = (
    <FilterBar
      onOpenRegionModal={() => setIsRegionModalOpen(true)}
      onSelectView={handleSelectChartView}
      selectedCountryName={selectedCountryName}
      selectedViewId={effectiveChartView}
      selectedViewLabel={selectedChartViewOption.label}
      viewOptions={chartViewOptions}
    />
  );

  return (
    <div className="app-shell">
      <AppHeader
        authStatus={authStatus}
        isDarkMode={isDarkMode}
        isLoggingOut={isLoggingOut}
        onLogout={() => void logout()}
        onToggleThemeMode={handleToggleThemeMode}
        themeToggleDisplayLabel={themeToggleDisplayLabel}
        themeToggleLabel={themeToggleLabel}
        user={user}
      />
      <main className="app-shell__main">
        <PlayerStage
          authStatus={authStatus}
          canNavigateVideos={canPlayNextVideo}
          chartContent={cinematicChartContent}
          cinematicToggleLabel={cinematicToggleLabel}
          favoriteToggleHelperText={favoriteToggleHelperText}
          favoriteToggleLabel={favoriteToggleLabel}
          filterContent={filterContent}
          isChartLoading={isChartLoading}
          isCinematicModeActive={isCinematicModeActive}
          isFavoriteToggleDisabled={!selectedChannelId || toggleFavoriteStreamerMutation.isPending}
          isManualPlaybackSaveDisabled={
            authStatus !== 'authenticated' || !selectedVideoId || isManualPlaybackSavePending
          }
          isMobileLayout={isMobileLayout}
          isSelectedChannelFavorited={isSelectedChannelFavorited}
          manualPlaybackSaveButtonLabel={isManualPlaybackSavePending ? '스크랩 중...' : '스크랩'}
          manualPlaybackSaveStatus={manualPlaybackSaveStatus ?? undefined}
          onManualPlaybackSave={() => void handleManualPlaybackSave()}
          onNextVideo={handlePlayNextVideo}
          onOpenRegionModal={() => setIsRegionModalOpen(true)}
          onPlaybackRestoreApplied={handlePlaybackRestoreApplied}
          onPreviousVideo={handlePlayPreviousVideo}
          onToggleCinematicMode={() => void handleToggleCinematicMode()}
          onToggleFavoriteStreamer={() => void handleToggleFavoriteStreamer()}
          playbackRestore={pendingPlaybackRestore}
          playerRef={videoPlayerRef}
          playerSectionRef={playerSectionRef}
          playerStageRef={playerStageRef}
          playerViewportRef={playerViewportRef}
          selectedCategoryLabel={selectedChartViewOption.label}
          selectedCountryName={selectedCountryName}
          selectedVideoChannelTitle={resolvedSelectedVideo?.snippet.channelTitle}
          selectedVideoId={selectedVideoId}
          selectedVideoPriceLabel={selectedVideoPriceLabel}
          selectedVideoRankLabel={selectedVideoRankLabel}
          selectedVideoRankTrendLabel={selectedVideoRankTrendIndicator?.label}
          selectedVideoRankTrendTone={selectedVideoRankTrendIndicator?.tone}
          selectedVideoStatLabel={selectedVideoStatLabel}
          selectedVideoTitle={resolvedSelectedVideo?.snippet.title}
          stageActionContent={gameActionContent}
          supplementalContent={portfolioContent}
          toggleFavoriteStreamerPending={toggleFavoriteStreamerMutation.isPending}
        />
        {isMobileLayout ? (
          <>
            {!isCinematicModeActive ? filterContent : null}
            {!isCinematicModeActive ? chartContent : null}
            <CommunityPanel
              selectedVideoId={selectedVideoId}
              selectedVideoTitle={resolvedSelectedVideo?.snippet.title}
            />
          </>
        ) : (
          <>
            {!isCinematicModeActive ? filterContent : null}
            {!isCinematicModeActive ? chartContent : null}
            <CommunityPanel
              selectedVideoId={selectedVideoId}
              selectedVideoTitle={resolvedSelectedVideo?.snippet.title}
            />
          </>
        )}
      </main>
      <GameRankHistoryModal
        error={
          selectedPositionRankHistoryError instanceof Error
            ? selectedPositionRankHistoryError
            : selectedVideoRankHistoryError instanceof Error
              ? selectedVideoRankHistoryError
              : null
        }
        history={selectedPositionRankHistory ?? selectedVideoRankHistory}
        isLoading={isPositionRankHistoryLoading || isVideoRankHistoryLoading}
        isOpen={Boolean(selectedRankHistoryPosition || selectedVideoRankHistoryVideoId)}
        onClose={() => {
          setSelectedRankHistoryPosition(null);
          setSelectedVideoRankHistoryVideoId(null);
        }}
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
      <GameDividendModal
        isOpen={isDividendModalOpen}
        onClose={() => setIsDividendModalOpen(false)}
        overview={gameDividendOverview}
      />
      <GameTradeModal
        confirmLabel={`${formatGameQuantity(normalizedBuyQuantity)} 매수`}
        currentRankLabel={formatRank(selectedVideoCurrentChartRank, { chartOut: selectedVideoIsChartOut })}
        helperText={buyModalHelperText}
        isOpen={activeTradeModal === 'buy' && Boolean(selectedVideoId) && Boolean(selectedVideoMarketEntry)}
        isSubmitting={isBuySubmitting}
        maxQuantity={maxBuyQuantity}
        mode="buy"
        onChangeQuantity={(quantity) => {
          if (maxBuyQuantity > 0 && quantity <= 0) {
            setBuyQuantity(maxBuyQuantity);
            return;
          }

          setBuyQuantity(
            maxBuyQuantity > 0
              ? Math.min(Math.max(MIN_GAME_QUANTITY, quantity), maxBuyQuantity)
              : Math.max(MIN_GAME_QUANTITY, quantity),
          );
        }}
        onClose={() => setActiveTradeModal(null)}
        onConfirm={() => void handleBuyCurrentVideo()}
        quantity={normalizedBuyQuantity}
        summaryItems={[
          { label: '수량', value: formatGameQuantity(normalizedBuyQuantity) },
          { label: '1개당 가격', value: formatPoints(selectedVideoUnitPricePoints ?? 0) },
          { label: '총 매수', value: formatPoints(totalSelectedVideoBuyPoints ?? (selectedVideoUnitPricePoints ?? 0)) },
        ]}
        summaryNote={undefined}
        thumbnailUrl={selectedVideoTradeThumbnailUrl}
        title={selectedGameActionTitle}
        unitPointsLabel={formatPoints(selectedVideoUnitPricePoints ?? 0)}
      />
      <GameTradeModal
        confirmLabel={`${formatGameQuantity(normalizedSellQuantity)} 매도`}
        currentRankLabel={formatRank(selectedVideoCurrentChartRank, { chartOut: selectedVideoIsChartOut })}
        helperText={sellModalHelperText}
        isOpen={activeTradeModal === 'sell' && Boolean(selectedVideoId) && selectedVideoOpenPositionCount > 0}
        isSubmitting={isSellSubmitting}
        maxQuantity={maxSellQuantity}
        mode="sell"
        onChangeQuantity={(quantity) => {
          if (maxSellQuantity > 0 && quantity <= 0) {
            setSellQuantity(maxSellQuantity);
            return;
          }

          setSellQuantity(
            maxSellQuantity > 0
              ? Math.min(Math.max(MIN_GAME_QUANTITY, quantity), maxSellQuantity)
              : Math.max(MIN_GAME_QUANTITY, quantity),
          );
        }}
        onClose={() => setActiveTradeModal(null)}
        onConfirm={() => void handleSellCurrentVideo()}
        quantity={normalizedSellQuantity}
        summaryItems={[
          { label: '수량', value: formatGameQuantity(normalizedSellQuantity) },
          { label: '예상 정산', value: formatPoints(selectedVideoSellSummary.settledPoints) },
          { label: '매도 금액', value: formatPoints(selectedVideoSellSummary.grossSellPoints) },
          { label: '수수료', value: formatPoints(selectedVideoSellSummary.feePoints) },
          {
            label: '예상 손익',
            tone: getPointTone(selectedVideoSellSummary.pnlPoints),
            value: formatPoints(selectedVideoSellSummary.pnlPoints),
          },
        ]}
        summaryNote={`예상 정산은 매도 금액 기준 ${SELL_FEE_RATE_LABEL} 수수료를 반영한 값입니다.`}
        thumbnailUrl={selectedVideoTradeThumbnailUrl}
        title={selectedGameActionTitle}
        unitPointsLabel={formatPoints(selectedVideoUnitPricePoints ?? selectedVideoSellSummary.settledPoints ?? 0)}
      />
      {isBuyableVideoSearchLoading ? (
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
      ) : null}
    </div>
  );
}

export default HomePage;
