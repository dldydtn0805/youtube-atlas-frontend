import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeaturedVideoSection } from '../../components/VideoList/VideoList';
import type { VideoPlayerHandle } from '../../components/VideoPlayer/VideoPlayer';
import AppHeader from './sections/AppHeader';
import { ChartPanel, CommunityPanel, FavoriteVideosPanel } from './sections/ContentPanels';
import { CinematicQuickFilters, FilterModal, FilterSummaryPanel } from './sections/FilterPanels';
import GameRankHistoryModal from './sections/GameRankHistoryModal';
import GameTradeModal from './sections/GameTradeModal';
import PlayerStage from './sections/PlayerStage';
import useAppPreferences from './hooks/useAppPreferences';
import useLogoutOnUnauthorized from './hooks/useLogoutOnUnauthorized';
import usePlaybackQueue from './hooks/usePlaybackQueue';
import {
  BUYABLE_ONLY_PREFETCH_LIMIT,
  buildNewChartEntriesSection,
  buildRealtimeSurgingSection,
  DEFAULT_CATEGORY_ID,
  FAVORITE_STREAMER_VIDEO_SECTION,
  GAME_PORTFOLIO_QUEUE_ID,
  HISTORY_PLAYBACK_QUEUE_ID,
  RESTORED_PLAYBACK_QUEUE_ID,
  findPlaybackQueueIdForVideo,
  filterVideoSection,
  formatSignedProfitRate,
  formatSelectedVideoRankLabel,
  formatVideoViewCount,
  getVideoThumbnailUrl,
  mapGamePositionToVideoItem,
  mergeSections,
  mergeUniqueVideoItems,
  mapPlaybackProgressToVideoItem,
  scrollElementToViewportCenter,
  shouldPrefetchBuyableVideos,
  shouldRenderRealtimeSurgingSection,
  sortedCountryCodes,
  type PendingPlaybackRestore,
  type RegionCode,
} from './utils';
import countryCodes from '../../constants/countryCodes';
import {
  ALL_VIDEO_CATEGORY_ID,
  getDetailVideoCategories,
  getMainVideoCategories,
  sortVideoCategories,
  supportsVideoGameActions,
  supportsVideoTrendSignals,
  VIDEO_GAME_REGION_CODE,
} from '../../constants/videoCategories';
import { useAuth } from '../../features/auth/useAuth';
import {
  useBuyGamePosition,
  useCurrentGameSeason,
  useGameLeaderboard,
  useGameLeaderboardPositions,
  useGameMarket,
  useGamePositionRankHistory,
  useMyGamePositions,
  useSellGamePositions,
} from '../../features/game/queries';
import type { GameCurrentSeason, GameMarketVideo, GamePosition } from '../../features/game/types';
import { upsertPlaybackProgress } from '../../features/playback/api';
import {
  useFavoriteStreamerVideos,
  useFavoriteStreamers,
  useToggleFavoriteStreamer,
} from '../../features/favorites/queries';
import {
  useNewChartEntries,
  useRealtimeSurging,
  useVideoRankHistory,
  useVideoTrendSignals,
} from '../../features/trending/queries';
import type { VideoTrendSignal } from '../../features/trending/types';
import { getVideoTrendBadges } from '../../features/trending/presentation';
import { fetchVideoById } from '../../features/youtube/api';
import { usePopularVideosByCategory, useVideoById, useVideoCategories } from '../../features/youtube/queries';
import type { YouTubeVideoItem } from '../../features/youtube/types';
import { ApiRequestError, isApiConfigured } from '../../lib/api';
import '../../styles/app.css';

const pointsFormatter = new Intl.NumberFormat('ko-KR');
const COLLAPSED_HOME_SECTIONS_STORAGE_KEY = 'youtube-atlas-collapsed-home-sections';
const FAVORITES_PANEL_SECTION_ID = 'favorites-panel';
const MAIN_CHART_SECTION_ID = 'chart-main-list';
const RANKING_GAME_SECTION_ID = 'ranking-game';
const seasonDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
});

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

function formatPlaybackSaveTimestamp(positionSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.floor(positionSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatRankTrendInlineLabel(options?: {
  isNew?: boolean | null;
  previousRank?: number | null;
  rankChange?: number | null;
}) {
  if (!options) {
    return null;
  }

  if (options.isNew) {
    return 'NEW';
  }

  if (typeof options.rankChange === 'number' && options.rankChange > 0) {
    return `▲ ${options.rankChange}`;
  }

  if (typeof options.rankChange === 'number' && options.rankChange < 0) {
    return `▼ ${Math.abs(options.rankChange)}`;
  }

  if (options.rankChange === 0 && options.previousRank !== null) {
    return '• 유지';
  }

  return null;
}

function formatHoldCountdown(remainingSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.floor(remainingSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    return `${hours}시간 ${String(minutes).padStart(2, '0')}분 ${String(seconds).padStart(2, '0')}초`;
  }

  if (minutes > 0) {
    return `${minutes}분 ${String(seconds).padStart(2, '0')}초`;
  }

  return `${seconds}초`;
}

function formatPoints(points: number) {
  return `${pointsFormatter.format(points)}P`;
}

function formatPointBalance(points: number) {
  return `${pointsFormatter.format(points)} 포인트`;
}

function formatMaybePoints(points?: number | null) {
  return typeof points === 'number' ? formatPoints(points) : '집계 중';
}

function getPointTone(points?: number | null) {
  if ((points ?? 0) > 0) {
    return 'gain';
  }

  if ((points ?? 0) < 0) {
    return 'loss';
  }

  return 'flat';
}

function formatRank(rank?: number | null, options?: { chartOut?: boolean }) {
  if (options?.chartOut) {
    return '차트 아웃';
  }

  return typeof rank === 'number' ? `${rank}위` : '집계 중';
}

function formatGameTimestamp(timestamp?: string | null) {
  if (!timestamp) {
    return '집계 중';
  }

  return seasonDateTimeFormatter.format(new Date(timestamp));
}

function getBuyBalanceDeltaPoints(
  currentGameSeason?: GameCurrentSeason,
  selectedVideoMarketEntry?: GameMarketVideo,
  quantity = 1,
) {
  if (!currentGameSeason || !selectedVideoMarketEntry) {
    return null;
  }

  const normalizedQuantity = Math.max(1, Math.floor(quantity));

  return currentGameSeason.wallet.balancePoints - selectedVideoMarketEntry.currentPricePoints * normalizedQuantity;
}

function getBuyRemainingPointsText(
  currentGameSeason?: GameCurrentSeason,
  selectedVideoMarketEntry?: GameMarketVideo,
  quantity = 1,
) {
  const buyBalanceDeltaPoints = getBuyBalanceDeltaPoints(currentGameSeason, selectedVideoMarketEntry, quantity);

  return typeof buyBalanceDeltaPoints === 'number' && buyBalanceDeltaPoints >= 0
    ? `구매 후 ${formatPointBalance(buyBalanceDeltaPoints)}가 남습니다.`
    : null;
}

function getBuyShortfallPointsText(
  currentGameSeason?: GameCurrentSeason,
  selectedVideoMarketEntry?: GameMarketVideo,
  quantity = 1,
) {
  const buyBalanceDeltaPoints = getBuyBalanceDeltaPoints(currentGameSeason, selectedVideoMarketEntry, quantity);

  return typeof buyBalanceDeltaPoints === 'number' && buyBalanceDeltaPoints < 0
    ? `${formatPointBalance(Math.abs(buyBalanceDeltaPoints))}가 부족합니다.`
    : null;
}

function getGamePositionQuantity(position: Pick<GamePosition, 'quantity'>) {
  return Number.isFinite(position.quantity) && position.quantity > 0 ? Math.floor(position.quantity) : 1;
}

interface OpenGameHolding {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  currentRank: number | null;
  chartOut: boolean;
  quantity: number;
  sellableQuantity: number;
  lockedQuantity: number;
  nextSellableInSeconds: number | null;
  stakePoints: number;
  currentPricePoints: number | null;
  profitPoints: number | null;
  latestCreatedAt: string;
}

function HomePage() {
  const { accessToken, isLoggingOut, logout, status: authStatus, user } = useAuth();
  const [pendingPlaybackRestore, setPendingPlaybackRestore] = useState<PendingPlaybackRestore | null>(null);
  const [isManualPlaybackSavePending, setIsManualPlaybackSavePending] = useState(false);
  const [manualPlaybackSaveStatus, setManualPlaybackSaveStatus] = useState<string | null>(null);
  const [activeGameTab, setActiveGameTab] = useState<'positions' | 'history' | 'leaderboard'>('positions');
  const [isBuyableOnlyFilterActive, setIsBuyableOnlyFilterActive] = useState(false);
  const [collapsedHomeSectionIds, setCollapsedHomeSectionIds] = useState(getInitialCollapsedHomeSectionIds);
  const [gameActionStatus, setGameActionStatus] = useState<string | null>(null);
  const [gameClock, setGameClock] = useState(() => Date.now());
  const [selectedLeaderboardUserId, setSelectedLeaderboardUserId] = useState<number | null>(null);
  const [selectedRankHistoryPosition, setSelectedRankHistoryPosition] = useState<GamePosition | null>(null);
  const [selectedVideoRankHistoryVideoId, setSelectedVideoRankHistoryVideoId] = useState<string | null>(null);
  const [activeTradeModal, setActiveTradeModal] = useState<'buy' | 'sell' | null>(null);
  const [activeTradeRequest, setActiveTradeRequest] = useState<'buy' | 'sell' | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [historyPlaybackVideo, setHistoryPlaybackVideo] = useState<YouTubeVideoItem | null>(null);
  const [historyPlaybackLoadingVideoId, setHistoryPlaybackLoadingVideoId] = useState<string | null>(null);
  const playerStageRef = useRef<HTMLDivElement | null>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle | null>(null);
  const playerSectionRef = useRef<HTMLElement | null>(null);
  const playerViewportRef = useRef<HTMLDivElement | null>(null);
  const nextPlaybackRestoreIdRef = useRef(0);
  const handledPlaybackRestoreSignatureRef = useRef<string | null>(null);
  const lastPersistedPlaybackSecondsRef = useRef<Record<string, number>>({});
  const tradeRequestLockRef = useRef<'buy' | 'sell' | null>(null);
  const {
    cinematicToggleLabel,
    closeFilterModal,
    handleCompleteFilterSelection,
    handleToggleCinematicMode,
    handleToggleThemeMode,
    isCinematicModeActive,
    isDarkMode,
    isFilterModalOpen,
    isMobileLayout,
    openFilterModal,
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
  const mainVideoCategories = getMainVideoCategories(sortedVideoCategories);
  const detailVideoCategories = getDetailVideoCategories(sortedVideoCategories);

  const selectedCategory =
    sortedVideoCategories.find((category) => category.id === selectedCategoryId) ?? sortedVideoCategories[0];
  const regionOptions = sortedCountryCodes.map((country) => ({
    value: country.code,
    label: `${country.code} · ${country.name}`,
  }));
  const detailCategoryOptions = detailVideoCategories.map((category) => ({
    value: category.id,
    label: category.label,
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
  const { openPositionsBuyPoints, openPositionsEvaluationPoints, openPositionsProfitPoints } = useMemo(
    () =>
      openGamePositions.reduce(
        (totals, position) => {
          const stakePoints =
            typeof position.stakePoints === 'number' && Number.isFinite(position.stakePoints)
              ? position.stakePoints
              : 0;
          const evaluationPoints =
            typeof position.currentPricePoints === 'number' && Number.isFinite(position.currentPricePoints)
              ? position.currentPricePoints
              : typeof position.profitPoints === 'number' && Number.isFinite(position.profitPoints)
                ? stakePoints + position.profitPoints
                : stakePoints;
          const profitPoints =
            typeof position.profitPoints === 'number' && Number.isFinite(position.profitPoints)
              ? position.profitPoints
              : evaluationPoints - stakePoints;

          totals.openPositionsBuyPoints += stakePoints;
          totals.openPositionsEvaluationPoints += evaluationPoints;
          totals.openPositionsProfitPoints += profitPoints;

          return totals;
        },
        {
          openPositionsBuyPoints: 0,
          openPositionsEvaluationPoints: 0,
          openPositionsProfitPoints: 0,
        },
      ),
    [openGamePositions],
  );
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
  const selectedSectionVideoIds = selectedSection?.items.map((item) => item.id) ?? [];
  const selectedCountryName =
    countryCodes.find((country) => country.code === selectedRegionCode)?.name ?? selectedRegionCode;
  const isAllCategorySelected = selectedCategory?.id === ALL_VIDEO_CATEGORY_ID;
  const isGameRegionSelected = selectedRegionCode.toUpperCase() === VIDEO_GAME_REGION_CODE;
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
  const detailCategoryHelperText = isVideoCategoriesLoading
    ? '세부 카테고리를 불러오는 중입니다.'
    : isVideoCategoriesError
      ? `불러오기에 실패했습니다. ${chartErrorMessage}`
      : detailVideoCategories.length > 0
        ? '추가 카테고리는 여기서 선택할 수 있습니다.'
        : '현재 이 국가에는 추가 세부 카테고리가 없습니다.';

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
  const favoriteStreamerVideoIds = favoriteStreamerVideoSection?.items.map((item) => item.id) ?? [];
  const shouldShowSelectedCategoryTrendSignals = supportsVideoTrendSignals(
    selectedCategory?.id,
    selectedRegionCode,
  );
  const shouldShowAllCategoryTrendSignals = supportsVideoTrendSignals(
    ALL_VIDEO_CATEGORY_ID,
    selectedRegionCode,
  );
  const shouldShowRealtimeSurgingSection = shouldRenderRealtimeSurgingSection(
    isAllCategorySelected,
    shouldShowAllCategoryTrendSignals,
  );
  const shouldShowNewChartEntriesSection = shouldShowRealtimeSurgingSection;

  const {
    data: trendSignalsByVideoId = {},
    isLoading: isTrendSignalsLoading,
    isError: isTrendSignalsError,
  } = useVideoTrendSignals(
    selectedRegionCode,
    selectedCategory?.id,
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
  } = useRealtimeSurging(selectedRegionCode, isApiConfigured && shouldShowRealtimeSurgingSection);
  const {
    data: newChartEntriesData,
    isLoading: isNewChartEntriesLoading,
    isError: isNewChartEntriesError,
  } = useNewChartEntries(selectedRegionCode, isApiConfigured && shouldShowNewChartEntriesSection);
  const realtimeSurgingSignalsByVideoId = Object.fromEntries(
    (realtimeSurgingData?.items ?? []).map((signal) => [signal.videoId, signal]),
  );
  const newChartEntriesSignalsByVideoId = Object.fromEntries(
    (newChartEntriesData?.items ?? []).map((signal) => [signal.videoId, signal]),
  );
  const chartTrendSignalsByVideoId = shouldShowSelectedCategoryTrendSignals
    ? {
        ...trendSignalsByVideoId,
        ...(isAllCategorySelected ? realtimeSurgingSignalsByVideoId : {}),
        ...(isAllCategorySelected ? newChartEntriesSignalsByVideoId : {}),
      }
    : {};
  const realtimeSurgingSection = buildRealtimeSurgingSection(
    shouldShowRealtimeSurgingSection,
    realtimeSurgingData,
  );
  const newChartEntriesSection = buildNewChartEntriesSection(
    shouldShowNewChartEntriesSection,
    newChartEntriesData,
  );
  const realtimeSurgingEmptyMessage =
    shouldShowRealtimeSurgingSection &&
    !isChartLoading &&
    !isRealtimeSurgingLoading &&
    !isRealtimeSurgingError
      ? `아직 +${realtimeSurgingData?.rankChangeThreshold ?? 5} 이상 급상승한 영상이 없습니다.`
      : undefined;
  const newChartEntriesEmptyMessage =
    shouldShowNewChartEntriesSection &&
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
  const restoredPlaybackVideo = user?.lastPlaybackProgress
    ? mapPlaybackProgressToVideoItem(user.lastPlaybackProgress)
    : undefined;
  const combinedPlayableItems = mergeUniqueVideoItems(
    realtimeSurgingSection?.items,
    newChartEntriesSection?.items,
    selectedPlaybackSection?.items,
    favoriteStreamerVideoSection?.items,
    gamePortfolioSection.items,
    historyPlaybackSection?.items,
    restoredPlaybackVideo ? [restoredPlaybackVideo] : undefined,
  );
  const {
    activePlaybackQueueId,
    canPlayNextVideo,
    handlePlayNextVideo,
    handlePlayPreviousVideo,
    handleSelectCategory,
    handleSelectVideo,
    resetForRegionChange,
    restorePlaybackSelection,
    selectedVideoId,
    updateActivePlaybackQueueId,
  } = usePlaybackQueue({
    favoriteStreamerVideoSection,
    gamePortfolioSection,
    historyPlaybackSection,
    newChartEntriesSection,
    isMobileLayout,
    playerSectionRef,
    playerViewportRef,
    realtimeSurgingSection,
    restoredPlaybackVideo,
    selectedCategoryId,
    selectedSection: selectedPlaybackSection,
    setSelectedCategoryId,
    sortedVideoCategories,
  });
  const selectedVideo = combinedPlayableItems.find((item) => item.id === selectedVideoId);
  const selectedVideoOpenPositions = useMemo(
    () => (selectedVideoId ? openGamePositions.filter((position) => position.videoId === selectedVideoId) : []),
    [openGamePositions, selectedVideoId],
  );
  const selectedVideoOpenPosition = selectedVideoOpenPositions[0];
  const selectedVideoMarketEntry = selectedVideoId
    ? gameMarket.find((marketVideo) => marketVideo.videoId === selectedVideoId)
    : undefined;
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
  const selectedVideoTrendSignal = selectedVideoId
    ? chartTrendSignalsByVideoId[selectedVideoId] ?? favoriteTrendSignalsByVideoId[selectedVideoId]
    : undefined;
  const selectedHistoricalPosition = selectedVideoId
    ? gameHistoryPositions.find((position) => position.videoId === selectedVideoId)
    : undefined;
  const selectedVideoOpenPositionCount = selectedVideoOpenPositions.reduce(
    (count, position) => count + getGamePositionQuantity(position),
    0,
  );
  const selectedVideoOpenPositionSummary = useMemo(
    () =>
      selectedVideoOpenPositions.reduce(
        (totals, position) => {
          const stakePoints =
            typeof position.stakePoints === 'number' && Number.isFinite(position.stakePoints)
              ? position.stakePoints
              : 0;
          const evaluationPoints =
            typeof position.currentPricePoints === 'number' && Number.isFinite(position.currentPricePoints)
              ? position.currentPricePoints
              : typeof position.profitPoints === 'number' && Number.isFinite(position.profitPoints)
                ? stakePoints + position.profitPoints
                : stakePoints;
          const profitPoints =
            typeof position.profitPoints === 'number' && Number.isFinite(position.profitPoints)
              ? position.profitPoints
              : evaluationPoints - stakePoints;

          totals.stakePoints += stakePoints;
          totals.evaluationPoints += evaluationPoints;
          totals.profitPoints += profitPoints;
          totals.quantity += getGamePositionQuantity(position);
          return totals;
        },
        {
          evaluationPoints: 0,
          profitPoints: 0,
          quantity: 0,
          stakePoints: 0,
        },
      ),
    [selectedVideoOpenPositions],
  );
  const selectedVideoUnitPricePoints = selectedVideoMarketEntry?.currentPricePoints ?? null;
  const selectedVideoAlreadyOwned = selectedVideoOpenPositionCount > 0;
  const openDistinctVideoCount = new Set(openGamePositions.map((position) => position.videoId)).size;
  const remainingOpenPositionSlots = currentGameSeason
    ? Math.max(0, currentGameSeason.maxOpenPositions - openDistinctVideoCount)
    : 0;
  const maxBuyQuantity =
    currentGameSeason && selectedVideoUnitPricePoints
      ? Math.max(
          0,
          selectedVideoAlreadyOwned || remainingOpenPositionSlots > 0
            ? Math.floor(currentGameSeason.wallet.balancePoints / selectedVideoUnitPricePoints)
            : 0,
        )
      : 0;
  const normalizedBuyQuantity = Math.max(1, Math.floor(buyQuantity));
  const totalSelectedVideoBuyPoints =
    typeof selectedVideoUnitPricePoints === 'number' ? selectedVideoUnitPricePoints * normalizedBuyQuantity : null;
  const selectedVideoCurrentChartRank =
    selectedVideoMarketEntry?.currentRank ??
    selectedVideoTrendSignal?.currentRank ??
    selectedVideoOpenPosition?.currentRank;
  const selectedVideoIsChartOut =
    selectedVideoMarketEntry || selectedVideoTrendSignal
      ? false
      : selectedVideoOpenPositions.some((position) => position.chartOut) || (selectedHistoricalPosition?.chartOut ?? false);
  const selectedVideoRankLabel = formatSelectedVideoRankLabel(
    selectedCountryName,
    selectedVideoCurrentChartRank,
    {
      chartOut: selectedVideoIsChartOut,
    },
  );
  const selectedVideoRankTrendLabel = formatRankTrendInlineLabel({
    isNew: selectedVideoMarketEntry?.isNew ?? selectedVideoTrendSignal?.isNew ?? false,
    previousRank: selectedVideoMarketEntry?.previousRank ?? selectedVideoTrendSignal?.previousRank ?? null,
    rankChange: selectedVideoMarketEntry?.rankChange ?? selectedVideoTrendSignal?.rankChange ?? null,
  });
  const selectedVideoStageRankLabel =
    selectedVideoRankLabel && selectedVideoRankTrendLabel
      ? `${selectedVideoRankLabel} · ${selectedVideoRankTrendLabel}`
      : selectedVideoRankLabel;
  const selectedVideoStatLabel = formatVideoViewCount(resolvedSelectedVideo?.statistics?.viewCount);
  const selectedChannelId = resolvedSelectedVideo?.snippet.channelId?.trim();
  const gameSeasonRegionMismatch =
    Boolean(currentGameSeason?.regionCode) &&
    selectedRegionCode.toUpperCase() !== currentGameSeason?.regionCode.toUpperCase();
  const isSelectedChannelFavorited = selectedChannelId
    ? favoriteStreamers.some((favoriteStreamer) => favoriteStreamer.channelId === selectedChannelId)
    : false;
  const favoriteToggleHelperText =
    authStatus === 'authenticated'
      ? isSelectedChannelFavorited
        ? '이 채널은 내 즐겨찾기에 저장되어 있습니다.'
        : '지금 보는 채널을 즐겨찾기로 저장할 수 있습니다.'
      : '즐겨찾기는 로그인 후 사용할 수 있습니다.';
  const favoriteToggleLabel =
    toggleFavoriteStreamerMutation.isPending
      ? '즐겨찾기 처리 중'
      : isSelectedChannelFavorited
        ? '즐겨찾기 저장됨'
        : '채널 즐겨찾기';
  const favoriteStreamerVideoErrorMessage =
    favoriteStreamerVideosError instanceof Error
      ? favoriteStreamerVideosError.message
      : '즐겨찾기 영상을 불러오지 못했습니다.';
  const isRankingGameCollapsed = collapsedHomeSectionIds.includes(RANKING_GAME_SECTION_ID);
  const isFavoritesPanelCollapsed = collapsedHomeSectionIds.includes(FAVORITES_PANEL_SECTION_ID);
  const collapsedFeaturedSectionIds = useMemo(
    () => collapsedHomeSectionIds.filter((sectionId) => sectionId !== FAVORITES_PANEL_SECTION_ID),
    [collapsedHomeSectionIds],
  );
  const toggleCollapsedSection = useCallback((sectionId: string) => {
    setCollapsedHomeSectionIds((currentSectionIds) =>
      currentSectionIds.includes(sectionId)
        ? currentSectionIds.filter((currentSectionId) => currentSectionId !== sectionId)
        : [...currentSectionIds, sectionId],
    );
  }, []);
  const buyableVideoIdSet = useMemo(
    () => new Set(gameMarket.filter((marketVideo) => marketVideo.canBuy).map((marketVideo) => marketVideo.videoId)),
    [gameMarket],
  );
  const isBuyableOnlyFilterAvailable =
    isApiConfigured &&
    authStatus === 'authenticated' &&
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
          getRankLabel: (item: YouTubeVideoItem) => {
            const signal = realtimeSurgingSignalsByVideoId[item.id];

            if (!signal?.currentRank) {
              return '실시간 급상승';
            }

            return `전체 ${signal.currentRank}위`;
          },
        });
      }

      if (filteredNewChartEntriesSection) {
        sections.push({
          section: filteredNewChartEntriesSection,
          eyebrow: 'Fresh Entries',
          emptyMessage: newChartEntriesEmptyMessage,
          getRankLabel: (item: YouTubeVideoItem) => {
            const signal = newChartEntriesSignalsByVideoId[item.id];

            if (!signal?.currentRank) {
              return '신규 진입';
            }

            return `전체 ${signal.currentRank}위`;
          },
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

  useLogoutOnUnauthorized(favoriteStreamersError, logout);
  useLogoutOnUnauthorized(favoriteStreamerVideosError, logout);
  useLogoutOnUnauthorized(currentGameSeasonError, logout);
  useLogoutOnUnauthorized(gameLeaderboardError, logout);
  useLogoutOnUnauthorized(gameMarketError, logout);
  useLogoutOnUnauthorized(openGamePositionsError, logout);
  useLogoutOnUnauthorized(gameHistoryPositionsError, logout);
  useLogoutOnUnauthorized(selectedPositionRankHistoryError, logout);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      return;
    }

    handledPlaybackRestoreSignatureRef.current = null;
    lastPersistedPlaybackSecondsRef.current = {};
    setIsManualPlaybackSavePending(false);
    setManualPlaybackSaveStatus(null);
    setActiveGameTab('positions');
    setGameActionStatus(null);
    setPendingPlaybackRestore(null);
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
    setBuyQuantity((currentQuantity) => {
      if (maxBuyQuantity <= 0) {
        return 1;
      }

      return Math.min(Math.max(1, Math.floor(currentQuantity)), maxBuyQuantity);
    });
  }, [maxBuyQuantity]);

  useEffect(() => {
    if (!shouldAutoPrefetchBuyableVideos) {
      return;
    }

    void fetchNextPage();
  }, [fetchNextPage, shouldAutoPrefetchBuyableVideos]);

  useEffect(() => {
    setManualPlaybackSaveStatus(null);
    setGameActionStatus(null);
  }, [selectedVideoId]);

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

  useEffect(() => {
    if (!manualPlaybackSaveStatus || isManualPlaybackSavePending) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setManualPlaybackSaveStatus(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isManualPlaybackSavePending, manualPlaybackSaveStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !user?.lastPlaybackProgress) {
      return;
    }

    const playbackProgress = user.lastPlaybackProgress;
    const playbackRestoreSignature = [
      user.id,
      playbackProgress.videoId,
      playbackProgress.positionSeconds,
      playbackProgress.updatedAt,
    ].join(':');

    if (handledPlaybackRestoreSignatureRef.current === playbackRestoreSignature) {
      return;
    }

    handledPlaybackRestoreSignatureRef.current = playbackRestoreSignature;
    nextPlaybackRestoreIdRef.current += 1;
    setPendingPlaybackRestore({
      positionSeconds: playbackProgress.positionSeconds,
      restoreId: nextPlaybackRestoreIdRef.current,
      videoId: playbackProgress.videoId,
    });
    restorePlaybackSelection(
      playbackProgress.videoId,
      findPlaybackQueueIdForVideo(playbackProgress.videoId, {
        favoriteStreamerVideoSection,
        gamePortfolioSection,
        historyPlaybackSection,
        newChartEntriesSection,
        realtimeSurgingSection,
        selectedSection: selectedPlaybackSection,
      }) ?? RESTORED_PLAYBACK_QUEUE_ID,
    );
  }, [
    authStatus,
    favoriteStreamerVideoSection,
    gamePortfolioSection,
    historyPlaybackSection,
    newChartEntriesSection,
    realtimeSurgingSection,
    restorePlaybackSelection,
    selectedPlaybackSection,
    user,
  ]);

  useEffect(() => {
    if (activePlaybackQueueId !== RESTORED_PLAYBACK_QUEUE_ID || !selectedVideoId) {
      return;
    }

    const matchedQueueId = findPlaybackQueueIdForVideo(selectedVideoId, {
      favoriteStreamerVideoSection,
      gamePortfolioSection,
      historyPlaybackSection,
      newChartEntriesSection,
      realtimeSurgingSection,
      selectedSection: selectedPlaybackSection,
    });

    if (matchedQueueId) {
      updateActivePlaybackQueueId(matchedQueueId);
    }
  }, [
    activePlaybackQueueId,
    favoriteStreamerVideoSection,
    gamePortfolioSection,
    historyPlaybackSection,
    newChartEntriesSection,
    realtimeSurgingSection,
    selectedPlaybackSection,
    selectedVideoId,
    updateActivePlaybackQueueId,
  ]);

  function handleSelectRegion(regionCode: RegionCode) {
    resetForRegionChange();
    updateRegionCode(regionCode);
  }

  const handlePlaybackRestoreApplied = useCallback((restoreId: number) => {
    setPendingPlaybackRestore((currentRestore) =>
      currentRestore?.restoreId === restoreId ? null : currentRestore,
    );
  }, []);

  const persistPlaybackProgress = useCallback(
    async (
      videoId: string,
      positionSeconds: number,
      options?: {
        force?: boolean;
      },
    ) => {
      if (authStatus !== 'authenticated' || !accessToken) {
        return null;
      }

      const playbackVideo = combinedPlayableItems.find((item) => item.id === videoId);

      if (!playbackVideo) {
        return null;
      }

      const normalizedPositionSeconds = Math.max(0, Math.floor(positionSeconds));
      const previousPositionSeconds = lastPersistedPlaybackSecondsRef.current[videoId];

      if (!options?.force && previousPositionSeconds === normalizedPositionSeconds) {
        return normalizedPositionSeconds;
      }

      lastPersistedPlaybackSecondsRef.current[videoId] = normalizedPositionSeconds;

      try {
        await upsertPlaybackProgress(accessToken, {
          channelTitle: playbackVideo.snippet.channelTitle || null,
          positionSeconds: normalizedPositionSeconds,
          thumbnailUrl: getVideoThumbnailUrl(playbackVideo),
          videoId,
          videoTitle: playbackVideo.snippet.title || null,
        });
      } catch (error) {
        if (previousPositionSeconds === undefined) {
          delete lastPersistedPlaybackSecondsRef.current[videoId];
        } else {
          lastPersistedPlaybackSecondsRef.current[videoId] = previousPositionSeconds;
        }

        if (
          error instanceof ApiRequestError &&
          (error.code === 'unauthorized' || error.code === 'session_expired')
        ) {
          void logout();
        }

        throw error;
      }

      return normalizedPositionSeconds;
    },
    [accessToken, authStatus, combinedPlayableItems, logout],
  );

  const handleManualPlaybackSave = useCallback(async () => {
    if (authStatus !== 'authenticated' || !selectedVideoId) {
      setManualPlaybackSaveStatus('로그인 후 스크랩할 수 있습니다.');
      return;
    }

    const snapshot = videoPlayerRef.current?.readPlaybackSnapshot();

    if (!snapshot) {
      setManualPlaybackSaveStatus('플레이어 준비 후 다시 스크랩해 주세요.');
      return;
    }

    setIsManualPlaybackSavePending(true);
    setManualPlaybackSaveStatus(null);

    try {
      const savedPositionSeconds = await persistPlaybackProgress(snapshot.videoId, snapshot.positionSeconds, {
        force: true,
      });

      if (savedPositionSeconds === null) {
        setManualPlaybackSaveStatus('스크랩할 재생 위치를 찾지 못했습니다.');
        return;
      }

      setManualPlaybackSaveStatus(
        `${formatPlaybackSaveTimestamp(savedPositionSeconds)} 지점까지 스크랩했습니다.`,
      );
    } catch (error) {
      setManualPlaybackSaveStatus(
        error instanceof Error ? error.message : '스크랩에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsManualPlaybackSavePending(false);
    }
  }, [authStatus, persistPlaybackProgress, selectedVideoId]);

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
  const openGameHoldings = useMemo(() => {
    const holdingByVideoId = new Map<string, OpenGameHolding>();

    for (const position of openGamePositions) {
      const quantity = getGamePositionQuantity(position);
      const remainingHoldSeconds = getRemainingHoldSeconds(position);
      const currentPricePoints =
        typeof position.currentPricePoints === 'number' && Number.isFinite(position.currentPricePoints)
          ? position.currentPricePoints
          : typeof position.profitPoints === 'number' && Number.isFinite(position.profitPoints)
            ? position.stakePoints + position.profitPoints
            : position.stakePoints;
      const profitPoints =
        typeof position.profitPoints === 'number' && Number.isFinite(position.profitPoints)
          ? position.profitPoints
          : currentPricePoints - position.stakePoints;
      const sellableQuantity = remainingHoldSeconds <= 0 ? quantity : 0;
      const lockedQuantity = Math.max(0, quantity - sellableQuantity);
      const existingHolding = holdingByVideoId.get(position.videoId);

      if (!existingHolding) {
        holdingByVideoId.set(position.videoId, {
          videoId: position.videoId,
          title: position.title,
          channelTitle: position.channelTitle,
          thumbnailUrl: position.thumbnailUrl,
          currentRank: position.currentRank,
          chartOut: position.chartOut,
          quantity,
          sellableQuantity,
          lockedQuantity,
          nextSellableInSeconds: lockedQuantity > 0 ? remainingHoldSeconds : null,
          stakePoints: position.stakePoints,
          currentPricePoints,
          profitPoints,
          latestCreatedAt: position.createdAt,
        });
        continue;
      }

      existingHolding.quantity += quantity;
      existingHolding.sellableQuantity += sellableQuantity;
      existingHolding.lockedQuantity += lockedQuantity;
      existingHolding.stakePoints += position.stakePoints;
      existingHolding.currentPricePoints =
        (existingHolding.currentPricePoints ?? 0) + currentPricePoints;
      existingHolding.profitPoints = (existingHolding.profitPoints ?? 0) + profitPoints;
      if (lockedQuantity > 0) {
        existingHolding.nextSellableInSeconds =
          existingHolding.nextSellableInSeconds === null
            ? remainingHoldSeconds
            : Math.min(existingHolding.nextSellableInSeconds, remainingHoldSeconds);
      }
      if (new Date(position.createdAt).getTime() > new Date(existingHolding.latestCreatedAt).getTime()) {
        existingHolding.latestCreatedAt = position.createdAt;
      }
      if (typeof existingHolding.currentRank !== 'number' && typeof position.currentRank === 'number') {
        existingHolding.currentRank = position.currentRank;
      }
      existingHolding.chartOut = existingHolding.chartOut || position.chartOut;
    }

    return [...holdingByVideoId.values()].sort(
      (left, right) => new Date(right.latestCreatedAt).getTime() - new Date(left.latestCreatedAt).getTime(),
    );
  }, [getRemainingHoldSeconds, openGamePositions]);
  const sellableSelectedVideoOpenPositions = useMemo(
    () =>
      [...selectedVideoOpenPositions]
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
        .filter((position) => getRemainingHoldSeconds(position) <= 0),
    [getRemainingHoldSeconds, selectedVideoOpenPositions],
  );
  const maxSellQuantity = sellableSelectedVideoOpenPositions.reduce(
    (count, position) => count + getGamePositionQuantity(position),
    0,
  );
  const normalizedSellQuantity = Math.max(1, Math.floor(sellQuantity));
  const selectedVideoSellCandidates = useMemo(
    () => {
      let remainingQuantity = normalizedSellQuantity;

      return sellableSelectedVideoOpenPositions.flatMap((position) => {
        if (remainingQuantity <= 0) {
          return [];
        }

        const fullQuantity = getGamePositionQuantity(position);
        const quantity = Math.min(remainingQuantity, fullQuantity);
        remainingQuantity -= quantity;
        const stakePoints = Math.round((position.stakePoints / fullQuantity) * quantity);
        const currentPricePoints =
          typeof position.currentPricePoints === 'number' && Number.isFinite(position.currentPricePoints)
            ? Math.round((position.currentPricePoints / fullQuantity) * quantity)
            : null;
        const profitPoints =
          typeof position.profitPoints === 'number' && Number.isFinite(position.profitPoints)
            ? Math.round((position.profitPoints / fullQuantity) * quantity)
            : null;

        return [
          {
            currentPricePoints,
            profitPoints,
            quantity,
            stakePoints,
          },
        ];
      });
    },
    [normalizedSellQuantity, sellableSelectedVideoOpenPositions],
  );
  const selectedVideoSellSummary = useMemo(
    () =>
      selectedVideoSellCandidates.reduce(
        (totals, candidate) => {
          const settledPoints =
            typeof candidate.currentPricePoints === 'number' && Number.isFinite(candidate.currentPricePoints)
              ? candidate.currentPricePoints
              : typeof candidate.profitPoints === 'number' && Number.isFinite(candidate.profitPoints)
                ? candidate.stakePoints + candidate.profitPoints
                : candidate.stakePoints;
          const pnlPoints =
            typeof candidate.profitPoints === 'number' && Number.isFinite(candidate.profitPoints)
              ? candidate.profitPoints
              : settledPoints - candidate.stakePoints;

          totals.pnlPoints += pnlPoints;
          totals.settledPoints += settledPoints;
          totals.quantity += candidate.quantity;
          totals.stakePoints += candidate.stakePoints;
          return totals;
        },
        {
          pnlPoints: 0,
          quantity: 0,
          settledPoints: 0,
          stakePoints: 0,
        },
      ),
    [selectedVideoSellCandidates],
  );
  const selectedGameActionTitle =
    selectedVideoOpenPosition?.title ?? resolvedSelectedVideo?.snippet.title ?? '선택한 영상';
  const selectedOpenHolding = selectedVideoId
    ? openGameHoldings.find((holding) => holding.videoId === selectedVideoId)
    : undefined;
  const selectedOpenHoldingLockedQuantity = selectedOpenHolding?.lockedQuantity ?? 0;
  const selectedOpenHoldingNextSellableInSeconds = selectedOpenHolding?.nextSellableInSeconds ?? null;
  const sellModalHelperText =
    maxSellQuantity > 0
      ? selectedOpenHoldingLockedQuantity > 0 && selectedOpenHoldingNextSellableInSeconds !== null
        ? `지금 ${maxSellQuantity}개 매도 가능하고, 나머지 ${selectedOpenHoldingLockedQuantity}개는 ${formatHoldCountdown(selectedOpenHoldingNextSellableInSeconds)} 후부터 가능합니다.`
        : `지금 매도 가능한 포지션은 ${maxSellQuantity}개이며 오래된 순서부터 정리됩니다.`
      : selectedOpenHoldingNextSellableInSeconds !== null
        ? `지금은 최소 보유 시간이 지나지 않았습니다. ${formatHoldCountdown(selectedOpenHoldingNextSellableInSeconds)} 후부터 매도할 수 있습니다.`
        : '지금은 최소 보유 시간이 지나지 않아 매도 가능한 포지션이 없습니다.';

  useEffect(() => {
    setSellQuantity((currentQuantity) => {
      if (maxSellQuantity <= 0) {
        return 1;
      }

      return Math.min(Math.max(1, Math.floor(currentQuantity)), maxSellQuantity);
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

    const clampedBuyQuantity = Math.max(1, Math.floor(buyQuantity));
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
          ? `지금은 최대 ${maxBuyQuantity}개까지 한 번에 매수할 수 있습니다.`
          : buyShortfallMessage ?? '지금은 매수할 수 없습니다.',
      );
      return;
    }

    try {
      tradeRequestLockRef.current = 'buy';
      setActiveTradeRequest('buy');
      const boughtPositions = await buyGamePositionMutation.mutateAsync({
        categoryId: '0',
        regionCode: currentGameSeason.regionCode,
        stakePoints: selectedVideoMarketEntry.currentPricePoints,
        quantity: clampedBuyQuantity,
        videoId: selectedVideoId,
      });
      setActiveTradeModal(null);
      setBuyQuantity(1);
      setGameActionStatus(
        `${formatPoints(selectedVideoMarketEntry.currentPricePoints * boughtPositions.length)}로 ${
          selectedVideoMarketEntry.currentRank
        }위 영상을 ${boughtPositions.length}개 매수했어요.`,
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
    activeTradeRequest,
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
  ]);
  const handleSellCurrentVideo = useCallback(async () => {
    if (tradeRequestLockRef.current) {
      return;
    }

    if (authStatus !== 'authenticated' || !selectedVideoId) {
      setGameActionStatus('로그인 후 보유 포지션을 매도할 수 있습니다.');
      return;
    }

    const clampedSellQuantity = Math.max(1, Math.floor(sellQuantity));

    if (maxSellQuantity <= 0 || clampedSellQuantity > maxSellQuantity) {
      setGameActionStatus(
        maxSellQuantity > 0
          ? `지금은 최대 ${maxSellQuantity}개까지 매도할 수 있습니다.`
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
      const totalPnlPoints = soldPositions.reduce(
        (sum, response) => sum + response.pnlPoints,
        0,
      );
      const totalStakePoints = soldPositions.reduce(
        (sum, response) => sum + response.stakePoints,
        0,
      );

      setActiveTradeModal(null);
      setSellQuantity(1);
      setGameActionStatus(
        `${selectedGameActionTitle} 포지션 ${soldPositions.length}개를 ${formatPoints(totalSettledPoints)} / 손익률 ${formatSignedProfitRate(
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
    activeTradeRequest,
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
        return 1;
      }

      return Math.min(Math.max(1, Math.floor(currentQuantity)), maxBuyQuantity);
    });
    setActiveTradeModal('buy');
  }, [maxBuyQuantity]);

  const openSellTradeModal = useCallback(() => {
    setSellQuantity((currentQuantity) => {
      if (maxSellQuantity <= 0) {
        return 1;
      }

      return Math.min(Math.max(1, Math.floor(currentQuantity)), maxSellQuantity);
    });
    setActiveTradeModal('sell');
  }, [maxSellQuantity]);

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

  const myLeaderboardEntry = gameLeaderboard.find((entry) => entry.me);
  const topLeaderboardEntries = gameLeaderboard.slice(0, 10);
  const buyRemainingPointsText = getBuyRemainingPointsText(
    currentGameSeason,
    selectedVideoMarketEntry,
    1,
  );
  const buyShortfallPointsText = getBuyShortfallPointsText(
    currentGameSeason,
    selectedVideoMarketEntry,
    1,
  );
  const buyModalRemainingPointsText = getBuyRemainingPointsText(
    currentGameSeason,
    selectedVideoMarketEntry,
    normalizedBuyQuantity,
  );
  const buyModalShortfallPointsText = getBuyShortfallPointsText(
    currentGameSeason,
    selectedVideoMarketEntry,
    normalizedBuyQuantity,
  );
  const buyModalHelperText =
    maxBuyQuantity > 0
      ? selectedVideoAlreadyOwned
        ? buyModalRemainingPointsText ?? '이 영상은 보유 포인트가 허용하는 만큼 계속 추가 매수할 수 있습니다.'
        : buyModalRemainingPointsText ??
          `새 영상은 남은 종목 슬롯 ${remainingOpenPositionSlots}개 안에서, 보유 포인트가 허용하는 만큼 매수할 수 있습니다.`
      : buyModalShortfallPointsText ?? selectedVideoMarketEntry?.buyBlockedReason ?? '지금은 추가 매수할 수 없습니다.';
  const currentVideoGameHelperText =
    !canShowGameActions
      ? !isGameRegionSelected
        ? '랭킹 게임은 대한민국 전체 카테고리에서만 가능합니다.'
        : '매수/매도는 전체 카테고리에서만 가능합니다.'
      : authStatus !== 'authenticated'
      ? '로그인하면 지금 보는 영상도 바로 게임 포지션으로 담을 수 있습니다.'
      : selectedVideoOpenPositionCount > 0
        ? selectedVideoMarketEntry?.canBuy
          ? `현재 이 영상을 ${selectedVideoOpenPositionCount}개 포지션으로 보유 중이며, 보유 포인트가 허용하는 만큼 계속 추가 매수할 수 있습니다.`
          : `현재 이 영상을 ${selectedVideoOpenPositionCount}개 포지션으로 보유 중입니다.`
        : selectedVideoMarketEntry
          ? selectedVideoMarketEntry.canBuy
            ? buyRemainingPointsText ?? '지금 바로 매수할 수 있습니다.'
            : buyShortfallPointsText ??
              selectedVideoMarketEntry.buyBlockedReason ??
              '지금은 매수할 수 없습니다.'
          : currentGameSeason
            ? gameSeasonRegionMismatch
              ? `게임 시즌은 ${currentGameSeason.regionCode} 기준으로 진행 중입니다.`
              : '현재 영상은 아직 게임 거래 대상이 아닙니다.'
            : isCurrentGameSeasonLoading
              ? '게임 시즌을 불러오는 중입니다.'
              : '다음 게임 시즌을 준비 중입니다.';
  const isCurrentVideoGameHelperWarning = Boolean(
    selectedVideoMarketEntry?.canBuy === false && buyShortfallPointsText,
  );
  const selectedVideoTrendBadgeSource: VideoTrendSignal | null = selectedVideoTrendSignal
    ? selectedVideoTrendSignal
    : selectedVideoMarketEntry
      ? {
          categoryId: selectedCategoryId,
          categoryLabel: selectedCategory?.label ?? '',
          capturedAt: selectedVideoMarketEntry.capturedAt,
          currentRank: selectedVideoMarketEntry.currentRank,
          currentViewCount: selectedVideoMarketEntry.currentViewCount,
          isNew: selectedVideoMarketEntry.isNew,
          previousRank: selectedVideoMarketEntry.previousRank,
          previousViewCount: null,
          rankChange: selectedVideoMarketEntry.rankChange,
          regionCode: currentGameSeason?.regionCode ?? selectedRegionCode,
          title: selectedVideoMarketEntry.title,
          channelTitle: selectedVideoMarketEntry.channelTitle,
          thumbnailUrl: selectedVideoMarketEntry.thumbnailUrl,
          videoId: selectedVideoMarketEntry.videoId,
          viewCountDelta: selectedVideoMarketEntry.viewCountDelta,
        }
      : null;
  const selectedVideoTrendBadges = getVideoTrendBadges(selectedVideoTrendBadgeSource);
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
        · 보유 {selectedVideoOpenPositionSummary.quantity}개 · 손익률{' '}
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
    </div>
  ) : null;
  const isSelectedVideoBuyDisabled =
    !selectedVideoId ||
    authStatus !== 'authenticated' ||
    isBuySubmitting ||
    !selectedVideoMarketEntry ||
    !selectedVideoMarketEntry.canBuy ||
    maxBuyQuantity <= 0 ||
    !currentGameSeason;
  const isSelectedVideoSellDisabled =
    !selectedVideoId ||
    authStatus !== 'authenticated' ||
    !canShowGameActions ||
    selectedVideoOpenPositionCount <= 0;
  const buyActionTitle =
    authStatus !== 'authenticated'
      ? '로그인 후 매수할 수 있습니다.'
      : selectedVideoMarketEntry?.canBuy
        ? selectedVideoOpenPositionCount > 0
          ? '현재 영상의 추가 매수 수량을 선택합니다.'
          : '현재 영상의 매수 수량을 선택합니다.'
        : buyShortfallPointsText ??
          selectedVideoMarketEntry?.buyBlockedReason ??
          (currentGameSeason ? '현재 영상은 게임 거래 대상이 아닙니다.' : '활성 시즌이 없습니다.');
  const sellActionTitle =
    !canShowGameActions
      ? '전체 카테고리에서만 매도할 수 있습니다.'
      : maxSellQuantity > 0
        ? `${maxSellQuantity}개까지 수량을 선택해 매도할 수 있습니다.`
        : sellModalHelperText;
  const gameActionContent = selectedVideoId ? (
    <>
      <button
        aria-label="선택한 영상 차트"
        className="app-shell__stage-action-button app-shell__stage-action-button--game"
        data-variant="chart"
        disabled={!canShowGameActions}
        onClick={() => {
          setSelectedRankHistoryPosition(null);
          setSelectedVideoRankHistoryVideoId(selectedVideoId);
        }}
        title={
          !canShowGameActions
            ? '대한민국 전체 카테고리에서만 차트를 볼 수 있습니다.'
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
  const selectedVideoTradeThumbnailUrl =
    selectedVideoMarketEntry?.thumbnailUrl ??
    selectedVideoOpenPosition?.thumbnailUrl ??
    (resolvedSelectedVideo ? getVideoThumbnailUrl(resolvedSelectedVideo) : null);
  const isChartActionDisabled = !selectedVideoId || !canShowGameActions;
  const selectedLeaderboardEntry = selectedLeaderboardUserId
    ? gameLeaderboard.find((entry) => entry.userId === selectedLeaderboardUserId) ?? null
    : null;
  const selectedLeaderboardPositionsTitle = selectedLeaderboardEntry
    ? `${selectedLeaderboardEntry.displayName}님의 보유 포지션`
    : '보유 포지션';
  const leaderboardContent =
    isGameLeaderboardLoading && !isGameLeaderboardError ? (
      <p className="app-shell__game-empty">리더보드를 불러오는 중입니다.</p>
    ) : isGameLeaderboardError ? (
      <p className="app-shell__game-empty">
        {gameLeaderboardError instanceof Error
          ? gameLeaderboardError.message
          : '리더보드를 불러오지 못했습니다.'}
      </p>
    ) : topLeaderboardEntries.length > 0 ? (
      <div className="app-shell__game-leaderboard-stack">
        <ol className="app-shell__game-leaderboard">
          {topLeaderboardEntries.map((entry) => {
            const isExpanded = selectedLeaderboardUserId === entry.userId;

            return (
              <li
                key={entry.userId}
                className="app-shell__game-leaderboard-row"
              >
                <button
                  className="app-shell__game-leaderboard-item app-shell__game-leaderboard-item--button"
                  data-expanded={isExpanded}
                  data-me={entry.me}
                  onClick={() =>
                    setSelectedLeaderboardUserId((currentUserId) =>
                      currentUserId === entry.userId ? null : entry.userId,
                    )
                  }
                  type="button"
                >
                  <div className="app-shell__game-leaderboard-rank">{entry.rank}</div>
                  {entry.pictureUrl ? (
                    <img
                      alt={`${entry.displayName} 프로필`}
                      className="app-shell__game-leaderboard-avatar"
                      loading="lazy"
                      src={entry.pictureUrl}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="app-shell__game-leaderboard-avatar app-shell__game-leaderboard-avatar--fallback"
                    >
                      {(entry.displayName || 'A').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="app-shell__game-leaderboard-copy">
                    <div className="app-shell__game-leaderboard-head">
                      <p className="app-shell__game-leaderboard-name">
                        {entry.displayName}
                      </p>
                      <p className="app-shell__game-leaderboard-total">
                        총자산 {formatPoints(entry.totalAssetPoints)}
                      </p>
                    </div>
                  </div>
                  <span className="app-shell__game-leaderboard-expand" aria-hidden="true">
                    ▾
                  </span>
                </button>
                {isExpanded ? (
                  <div className="app-shell__game-leaderboard-positions" aria-label={selectedLeaderboardPositionsTitle}>
                    <p className="app-shell__game-leaderboard-positions-title">{selectedLeaderboardPositionsTitle}</p>
                    {isSelectedLeaderboardPositionsLoading ? (
                      <p className="app-shell__game-leaderboard-positions-status">보유 포지션을 불러오는 중입니다.</p>
                    ) : isSelectedLeaderboardPositionsError ? (
                      <p className="app-shell__game-leaderboard-positions-status">
                        {selectedLeaderboardPositionsError instanceof Error
                          ? selectedLeaderboardPositionsError.message
                          : '보유 포지션을 불러오지 못했습니다.'}
                      </p>
                    ) : selectedLeaderboardPositions.length > 0 ? (
                      <ul className="app-shell__game-leaderboard-position-list">
                        {selectedLeaderboardPositions.map((position) => (
                          <li key={position.id} className="app-shell__game-leaderboard-position-item">
                            <img
                              alt=""
                              className="app-shell__game-leaderboard-position-thumb"
                              loading="lazy"
                              src={position.thumbnailUrl}
                            />
                            <div className="app-shell__game-leaderboard-position-copy">
                              <p className="app-shell__game-leaderboard-position-title">{position.title}</p>
                              <p className="app-shell__game-leaderboard-position-meta">
                                현재{' '}
                                <span className="app-shell__game-rank-emphasis">
                                  {formatRank(position.currentRank, { chartOut: position.chartOut })}
                                </span>{' '}
                                · 평가 금액{' '}
                                {formatMaybePoints(position.currentPricePoints)}
                              </p>
                              <p className="app-shell__game-leaderboard-position-meta">
                                매수 금액 {formatPoints(position.stakePoints)} · 손익률{' '}
                                <span data-tone={getPointTone(position.profitPoints)}>
                                  {formatSignedProfitRate(position.profitPoints, position.stakePoints)}
                                </span>
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="app-shell__game-leaderboard-positions-status">보유 중인 포지션이 없습니다.</p>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
        {myLeaderboardEntry ? (
          <section className="app-shell__game-leaderboard-pinned" aria-label="내 순위">
            <p className="app-shell__game-leaderboard-pinned-label">내 순위</p>
            <div className="app-shell__game-leaderboard-row">
              <button
                className="app-shell__game-leaderboard-item app-shell__game-leaderboard-item--button"
                data-expanded={selectedLeaderboardUserId === myLeaderboardEntry.userId}
                data-me="true"
                onClick={() =>
                  setSelectedLeaderboardUserId((currentUserId) =>
                    currentUserId === myLeaderboardEntry.userId ? null : myLeaderboardEntry.userId,
                  )
                }
                type="button"
              >
                <div className="app-shell__game-leaderboard-rank">{myLeaderboardEntry.rank}</div>
                {myLeaderboardEntry.pictureUrl ? (
                  <img
                    alt={`${myLeaderboardEntry.displayName} 프로필`}
                    className="app-shell__game-leaderboard-avatar"
                    loading="lazy"
                    src={myLeaderboardEntry.pictureUrl}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="app-shell__game-leaderboard-avatar app-shell__game-leaderboard-avatar--fallback"
                  >
                    {(myLeaderboardEntry.displayName || 'A').slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="app-shell__game-leaderboard-copy">
                  <div className="app-shell__game-leaderboard-head">
                    <p className="app-shell__game-leaderboard-name">{myLeaderboardEntry.displayName}</p>
                    <p className="app-shell__game-leaderboard-total">
                      총자산 {formatPoints(myLeaderboardEntry.totalAssetPoints)}
                    </p>
                  </div>
                </div>
                <span className="app-shell__game-leaderboard-expand" aria-hidden="true">
                  ▾
                </span>
              </button>
              {selectedLeaderboardUserId === myLeaderboardEntry.userId ? (
                <div className="app-shell__game-leaderboard-positions" aria-label={selectedLeaderboardPositionsTitle}>
                  <p className="app-shell__game-leaderboard-positions-title">{selectedLeaderboardPositionsTitle}</p>
                  {isSelectedLeaderboardPositionsLoading ? (
                    <p className="app-shell__game-leaderboard-positions-status">보유 포지션을 불러오는 중입니다.</p>
                  ) : isSelectedLeaderboardPositionsError ? (
                    <p className="app-shell__game-leaderboard-positions-status">
                      {selectedLeaderboardPositionsError instanceof Error
                        ? selectedLeaderboardPositionsError.message
                        : '보유 포지션을 불러오지 못했습니다.'}
                    </p>
                  ) : selectedLeaderboardPositions.length > 0 ? (
                    <ul className="app-shell__game-leaderboard-position-list">
                      {selectedLeaderboardPositions.map((position) => (
                        <li key={position.id} className="app-shell__game-leaderboard-position-item">
                          <img
                            alt=""
                            className="app-shell__game-leaderboard-position-thumb"
                            loading="lazy"
                            src={position.thumbnailUrl}
                          />
                          <div className="app-shell__game-leaderboard-position-copy">
                            <p className="app-shell__game-leaderboard-position-title">{position.title}</p>
                            <p className="app-shell__game-leaderboard-position-meta">
                              현재{' '}
                              <span className="app-shell__game-rank-emphasis">
                                {formatRank(position.currentRank, { chartOut: position.chartOut })}
                              </span>{' '}
                              · 평가 금액{' '}
                              {formatMaybePoints(position.currentPricePoints)}
                            </p>
                            <p className="app-shell__game-leaderboard-position-meta">
                              매수 금액 {formatPoints(position.stakePoints)} · 손익률{' '}
                              <span data-tone={getPointTone(position.profitPoints)}>
                                {formatSignedProfitRate(position.profitPoints, position.stakePoints)}
                              </span>
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="app-shell__game-leaderboard-positions-status">보유 중인 포지션이 없습니다.</p>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    ) : currentGameSeason ? (
      <p className="app-shell__game-empty">아직 리더보드에 표시할 참가자가 없습니다.</p>
    ) : null;
  const positionsContent =
    openGameHoldings.length > 0 ? (
      <ul className="app-shell__game-positions">
        {openGameHoldings.map((holding) => {
          const isSelectedPosition = holding.videoId === selectedVideoId;
          const averageBuyPricePoints = Math.round(holding.stakePoints / Math.max(1, holding.quantity));
          const averageCurrentPricePoints =
            typeof holding.currentPricePoints === 'number'
              ? Math.round(holding.currentPricePoints / Math.max(1, holding.quantity))
              : null;

          return (
            <li
              key={holding.videoId}
              className="app-shell__game-position"
              data-selected={isSelectedPosition}
            >
              <button
                className="app-shell__game-position-select"
                onClick={() => handleSelectGamePositionVideo(holding.videoId)}
                type="button"
              >
                <img
                  alt=""
                  className="app-shell__game-position-thumb"
                  loading="lazy"
                  src={holding.thumbnailUrl}
                />
                <div className="app-shell__game-position-copy">
                  <p className="app-shell__game-position-title">{holding.title}</p>
                  <p className="app-shell__game-position-meta">
                    보유 수량 {holding.quantity}개 · 현재 순위{' '}
                    <span className="app-shell__game-rank-emphasis">
                      {formatRank(holding.currentRank, {
                        chartOut: holding.chartOut,
                      })}
                    </span>
                  </p>
                  <p className="app-shell__game-position-meta">
                    평균 매수 {formatPoints(averageBuyPricePoints)} · 평균 평가 {formatMaybePoints(averageCurrentPricePoints)} · 손익률{' '}
                    <span data-tone={getPointTone(holding.profitPoints)}>
                      {formatSignedProfitRate(holding.profitPoints, holding.stakePoints)}
                    </span>
                  </p>
                </div>
              </button>
              <div className="app-shell__game-position-side">
                <span className="app-shell__game-position-hold">
                  {canShowGameActions
                    ? holding.sellableQuantity > 0
                      ? holding.lockedQuantity > 0 && holding.nextSellableInSeconds !== null
                        ? `지금 ${holding.sellableQuantity}개 매도 가능 · ${holding.lockedQuantity}개는 ${formatHoldCountdown(holding.nextSellableInSeconds)} 후`
                        : `지금 ${holding.sellableQuantity}개 매도 가능`
                      : holding.nextSellableInSeconds !== null
                        ? `${formatHoldCountdown(holding.nextSellableInSeconds)} 후 매도 가능`
                        : '아직 매도 가능 수량 없음'
                    : !isGameRegionSelected
                      ? '대한민국 전체 카테고리에서 매도 가능'
                      : '전체 카테고리에서 매도 가능'}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    ) : currentGameSeason ? (
      <p className="app-shell__game-empty">
        {!isGameRegionSelected
          ? '랭킹 게임 참여와 포지션 정리는 대한민국 전체 카테고리에서만 가능합니다.'
          : canShowGameActions
          ? '아직 보유 중인 영상이 없어요. 지금 보는 영상에서 바로 시작할 수 있습니다.'
          : '새 포지션 매수와 기존 포지션 매도는 전체 카테고리에서만 가능합니다.'}
      </p>
    ) : null;
  const historyContent =
    isGameHistoryLoading ? (
      <p className="app-shell__game-empty">거래내역을 불러오는 중입니다.</p>
    ) : gameHistoryPositions.length > 0 ? (
      <ul className="app-shell__game-history">
        {gameHistoryPositions.map((position) => {
          const playbackQueueId = findPlaybackQueueIdForVideo(position.videoId, {
            favoriteStreamerVideoSection,
            gamePortfolioSection,
            historyPlaybackSection,
            newChartEntriesSection,
            realtimeSurgingSection,
            selectedSection: selectedPlaybackSection,
          });
          const isSelectable = Boolean(playbackQueueId);
          const isSelectedPosition = position.videoId === selectedVideoId;
          const isLoadingHistoryPlayback = historyPlaybackLoadingVideoId === position.videoId;
          const historyStatusTone =
            position.status === 'OPEN'
              ? 'open'
              : position.status === 'AUTO_CLOSED'
                ? 'auto'
                : 'closed';
          const historyStatusLabel =
            position.status === 'OPEN'
              ? '보유 중'
              : position.status === 'AUTO_CLOSED'
                ? '자동 청산'
                : '매도 완료';

          return (
            <li
              key={position.id}
              className="app-shell__game-history-item"
              data-selected={isSelectedPosition}
            >
              <button
                className="app-shell__game-history-select"
                disabled={isLoadingHistoryPlayback}
                onClick={() => {
                  void handleSelectGameHistoryVideo(position, playbackQueueId);
                }}
                title={
                  isLoadingHistoryPlayback
                    ? '영상 정보를 다시 불러오는 중입니다.'
                    : isSelectable
                      ? '이 영상을 플레이어에서 엽니다.'
                      : '영상 정보를 다시 불러와 플레이어에서 엽니다.'
                }
                type="button"
              >
                <img
                  alt=""
                  className="app-shell__game-history-thumb"
                  loading="lazy"
                  src={position.thumbnailUrl}
                />
                <div className="app-shell__game-history-copy">
                  <p className="app-shell__game-history-title">{position.title}</p>
                  {isLoadingHistoryPlayback ? (
                    <p className="app-shell__game-history-meta">YouTube에서 영상 정보를 다시 불러오는 중입니다.</p>
                  ) : null}
                  <p className="app-shell__game-history-meta">
                    매수 <span className="app-shell__game-rank-emphasis">{formatRank(position.buyRank)}</span> · 매수 금액{' '}
                    {formatPoints(position.stakePoints)}
                  </p>
                  <p className="app-shell__game-history-meta">
                    {position.status === 'OPEN' ? '현재' : position.status === 'AUTO_CLOSED' ? '자동청산' : '매도'}{' '}
                    <span className="app-shell__game-rank-emphasis">
                      {formatRank(position.currentRank, {
                        chartOut: position.chartOut,
                      })}
                    </span>{' '}
                    · {position.status === 'OPEN' ? '평가 금액' : '정산 금액'} {formatMaybePoints(position.currentPricePoints)}
                  </p>
                  <p className="app-shell__game-history-meta">
                    손익률{' '}
                    <span data-tone={getPointTone(position.profitPoints)}>
                      {formatSignedProfitRate(position.profitPoints, position.stakePoints)}
                    </span>
                  </p>
                </div>
              </button>
              <div className="app-shell__game-history-side">
                <span
                  className="app-shell__game-history-status"
                  data-status={historyStatusTone}
                >
                  {historyStatusLabel}
                </span>
                <p className="app-shell__game-history-time">
                  {position.closedAt
                    ? `종료 ${formatGameTimestamp(position.closedAt)}`
                    : `진입 ${formatGameTimestamp(position.createdAt)}`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    ) : currentGameSeason ? (
      <p className="app-shell__game-empty">아직 현재 시즌 거래내역이 없습니다.</p>
    ) : null;
  const portfolioContent =
    isAllCategorySelected && isGameRegionSelected && isApiConfigured && authStatus === 'authenticated' ? (
      <div className="app-shell__game-panel">
        <div className="app-shell__game-panel-header">
          <div className="app-shell__game-panel-copy">
            <p className="app-shell__game-panel-eyebrow">Ranking Game</p>
            <div className="app-shell__game-panel-title-row">
              <h3 className="app-shell__game-panel-title">
                {currentGameSeason ? `${currentGameSeason.regionCode} 시즌` : '시즌 준비 중'}
              </h3>
              <button
                aria-expanded={!isRankingGameCollapsed}
                aria-label={isRankingGameCollapsed ? '랭킹 게임 펼치기' : '랭킹 게임 숨기기'}
                className="app-shell__collapse-toggle"
                data-active={isRankingGameCollapsed}
                onClick={() => toggleCollapsedSection(RANKING_GAME_SECTION_ID)}
                type="button"
              >
                <span className="app-shell__collapse-toggle-icon" aria-hidden="true">
                  ▾
                </span>
              </button>
            </div>
            {currentGameSeason ? (
              <p className="app-shell__game-panel-subtle">
                종료 {seasonDateTimeFormatter.format(new Date(currentGameSeason.endAt))}
              </p>
            ) : null}
          </div>
        </div>
        {!isRankingGameCollapsed ? (
          <>
            <div className="app-shell__game-panel-metrics">
              <span className="app-shell__game-panel-metric">
                <span className="app-shell__game-panel-metric-label">잔액</span>
                <span className="app-shell__game-panel-metric-value">
                  {currentGameSeason ? formatPoints(currentGameSeason.wallet.balancePoints) : '-'}
                </span>
              </span>
              <span className="app-shell__game-panel-metric">
                <span className="app-shell__game-panel-metric-label">총자산</span>
                <span className="app-shell__game-panel-metric-value">
                  {computedWalletTotalAssetPoints !== null ? formatPoints(computedWalletTotalAssetPoints) : '-'}
                </span>
              </span>
              <span className="app-shell__game-panel-metric">
                <span className="app-shell__game-panel-metric-label">보유</span>
                <span className="app-shell__game-panel-metric-value">
                  {`${new Set(openGamePositions.map((position) => position.videoId)).size}/${currentGameSeason?.maxOpenPositions ?? '-'}`}
                </span>
              </span>
              <span className="app-shell__game-panel-metric">
                <span className="app-shell__game-panel-metric-label">손익률</span>
                <span
                  className="app-shell__game-panel-metric-value"
                  data-tone={getPointTone(openPositionsProfitPoints)}
                >
                  {currentGameSeason
                    ? formatSignedProfitRate(openPositionsProfitPoints, openPositionsBuyPoints)
                    : '-'}
                </span>
              </span>
              <span className="app-shell__game-panel-metric">
                <span className="app-shell__game-panel-metric-label">총 매수 금액</span>
                <span className="app-shell__game-panel-metric-value">
                  {currentGameSeason ? formatPoints(openPositionsBuyPoints) : '-'}
                </span>
              </span>
              <span className="app-shell__game-panel-metric">
                <span className="app-shell__game-panel-metric-label">총 평가 금액</span>
                <span className="app-shell__game-panel-metric-value">
                  {currentGameSeason ? formatPoints(openPositionsEvaluationPoints) : '-'}
                </span>
              </span>
            </div>
            <p
              className="app-shell__game-panel-helper"
              data-tone={isCurrentVideoGameHelperWarning ? 'warning' : undefined}
            >
              {currentGameSeason
                ? currentVideoGameHelperText
                : isCurrentGameSeasonLoading
                  ? '게임 시즌을 불러오는 중입니다.'
                  : currentGameSeasonError instanceof Error
                    ? currentGameSeasonError.message
                    : '다음 게임 시즌을 준비 중입니다.'}
            </p>
            {gameActionStatus ? <p className="app-shell__game-panel-status">{gameActionStatus}</p> : null}
            {selectedVideoId ? (
              <>
                <div className="app-shell__game-panel-actions">
                  <div className="app-shell__game-panel-actions-copy">
                    <p className="app-shell__game-panel-actions-eyebrow">
                      {selectedVideoOpenPositionCount > 0 ? 'Selected Positions' : 'Selected Video'}
                    </p>
                    <div className="app-shell__game-panel-actions-main">
                      {selectedVideoTradeThumbnailUrl ? (
                        <img
                          alt=""
                          className="app-shell__game-panel-actions-thumb"
                          loading="lazy"
                          src={selectedVideoTradeThumbnailUrl}
                        />
                      ) : null}
                      <div className="app-shell__game-panel-actions-body">
                        <p className="app-shell__game-panel-actions-title">{selectedGameActionTitle}</p>
                        {currentVideoGamePriceSummary}
                      </div>
                    </div>
                  </div>
                  <div className="app-shell__game-panel-actions-buttons">
                    <button
                      className="app-shell__game-panel-action"
                      disabled={isChartActionDisabled}
                      onClick={() => {
                        setSelectedRankHistoryPosition(null);
                        setSelectedVideoRankHistoryVideoId(selectedVideoId);
                      }}
                      title={
                        !canShowGameActions
                          ? '대한민국 전체 카테고리에서만 차트를 볼 수 있습니다.'
                          : '선택한 영상의 랭킹 차트를 엽니다.'
                      }
                      type="button"
                    >
                      차트
                    </button>
                    <button
                      className="app-shell__game-panel-action"
                      disabled={!canShowGameActions || isSelectedVideoBuyDisabled}
                      data-variant="buy"
                      onClick={openBuyTradeModal}
                      title={
                        !canShowGameActions
                          ? '전체 카테고리에서만 매수할 수 있습니다.'
                          : buyActionTitle
                      }
                      type="button"
                    >
                      {isBuySubmitting ? '매수 중...' : '매수'}
                    </button>
                    {selectedVideoOpenPositionCount > 0 ? (
                      <button
                        className="app-shell__game-panel-action"
                        data-variant="sell"
                        disabled={isSelectedVideoSellDisabled}
                        onClick={openSellTradeModal}
                        title={sellActionTitle}
                        type="button"
                      >
                        {isSellSubmitting ? '매도 중...' : '매도'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
            <div
              aria-label="게임 패널 탭"
              className="app-shell__game-tabs"
              role="tablist"
            >
              <button
                aria-selected={activeGameTab === 'positions'}
                className="app-shell__game-tab"
                data-active={activeGameTab === 'positions'}
                onClick={() => setActiveGameTab('positions')}
                role="tab"
                type="button"
              >
                내 포지션
              </button>
              <button
                aria-selected={activeGameTab === 'history'}
                className="app-shell__game-tab"
                data-active={activeGameTab === 'history'}
                onClick={() => setActiveGameTab('history')}
                role="tab"
                type="button"
              >
                거래내역
              </button>
              <button
                aria-selected={activeGameTab === 'leaderboard'}
                className="app-shell__game-tab"
                data-active={activeGameTab === 'leaderboard'}
                onClick={() => setActiveGameTab('leaderboard')}
                role="tab"
                type="button"
              >
                리더보드
              </button>
            </div>
            <div className="app-shell__game-tab-panel" role="tabpanel">
              {activeGameTab === 'positions'
                ? positionsContent
                : activeGameTab === 'history'
                  ? historyContent
                  : leaderboardContent}
            </div>
          </>
        ) : null}
      </div>
    ) : null;

  const chartContent = (
    <ChartPanel
      buyableVideoSearchStatus={buyableVideoSearchStatus}
      chartErrorMessage={chartErrorMessage}
      featuredSections={featuredChartSections}
      collapsedFeaturedSectionIds={collapsedFeaturedSectionIds}
      hasNextPage={hasNextPage}
      hasResolvedTrendSignals={hasResolvedChartTrendSignals}
      isBuyableOnlyFilterActive={isBuyableOnlyFilterActive}
      isBuyableOnlyFilterAvailable={isBuyableOnlyFilterAvailable}
      isChartError={isChartError}
      isChartLoading={isChartLoading}
      isFetchingNextPage={isFetchingNextPage}
      mainSectionCollapseKey={MAIN_CHART_SECTION_ID}
      onLoadMore={() => void fetchNextPage()}
      onToggleFeaturedSectionCollapse={toggleCollapsedSection}
      onToggleBuyableOnlyFilter={() => setIsBuyableOnlyFilterActive((current) => !current)}
      onSelectVideo={handleSelectVideo}
      section={filteredSelectedPlaybackSection}
      selectedCategoryLabel={selectedCategory?.label}
      selectedVideoId={selectedVideoId}
      trendSignalsByVideoId={chartTrendSignalsByVideoId}
    />
  );

  const cinematicChartContent = (
    <ChartPanel
      buyableVideoSearchStatus={buyableVideoSearchStatus}
      chartErrorMessage={chartErrorMessage}
      className="app-shell__panel--chart-cinematic"
      featuredSections={featuredChartSections}
      collapsedFeaturedSectionIds={collapsedFeaturedSectionIds}
      hasNextPage={hasNextPage}
      hasResolvedTrendSignals={hasResolvedChartTrendSignals}
      isBuyableOnlyFilterActive={isBuyableOnlyFilterActive}
      isBuyableOnlyFilterAvailable={isBuyableOnlyFilterAvailable}
      isChartError={isChartError}
      isChartLoading={isChartLoading}
      isFetchingNextPage={isFetchingNextPage}
      mainSectionCollapseKey={MAIN_CHART_SECTION_ID}
      onLoadMore={() => void fetchNextPage()}
      onToggleFeaturedSectionCollapse={toggleCollapsedSection}
      onToggleBuyableOnlyFilter={() => setIsBuyableOnlyFilterActive((current) => !current)}
      onSelectVideo={handleSelectVideo}
      section={filteredSelectedPlaybackSection}
      selectedCategoryLabel={selectedCategory?.label}
      selectedVideoId={selectedVideoId}
      trendSignalsByVideoId={chartTrendSignalsByVideoId}
    />
  );

  const favoriteVideosContent = isAllCategorySelected ? (
    <FavoriteVideosPanel
      authStatus={authStatus}
      favoriteStreamerCount={favoriteStreamers.length}
      favoriteStreamerVideoErrorMessage={favoriteStreamerVideoErrorMessage}
      favoriteStreamerVideoSection={favoriteStreamerVideoSection}
      favoriteStreamers={favoriteStreamers}
      favoriteTrendSignalsByVideoId={favoriteTrendSignalsByVideoId}
      hasNextPage={hasNextFavoriteStreamerVideosPage}
      hasResolvedTrendSignals={
        isApiConfigured &&
        shouldShowAllCategoryTrendSignals &&
        !isFavoriteTrendSignalsLoading &&
        !isFavoriteTrendSignalsError
      }
      isCinematicModeActive={isCinematicModeActive}
      isCollapsed={isFavoritesPanelCollapsed}
      isFavoriteStreamerVideosError={isFavoriteStreamerVideosError}
      isFavoriteStreamerVideosLoading={isFavoriteStreamerVideosLoading}
      isFavoriteStreamersError={isFavoriteStreamersError}
      isFavoriteStreamersLoading={isFavoriteStreamersLoading}
      isFetchingNextPage={isFetchingNextFavoriteStreamerVideosPage}
      onLoadMore={() => void fetchNextFavoriteStreamerVideosPage()}
      onSelectVideo={handleSelectVideo}
      onToggleCollapse={() => toggleCollapsedSection(FAVORITES_PANEL_SECTION_ID)}
      selectedCountryName={selectedCountryName}
      selectedVideoId={selectedVideoId}
      trendSignalsByVideoId={favoriteTrendSignalsByVideoId}
    />
  ) : null;

  const filterSummaryContent = (
    <FilterSummaryPanel
      mainVideoCategories={mainVideoCategories}
      onOpenFilterModal={openFilterModal}
      onSelectCategory={handleSelectCategory}
      selectedCategoryId={selectedCategoryId}
      selectedCategoryLabel={selectedCategory?.label}
      selectedCountryName={selectedCountryName}
    />
  );

  const cinematicQuickFiltersContent = isCinematicModeActive ? (
    <CinematicQuickFilters
      mainVideoCategories={mainVideoCategories}
      onSelectCategory={handleSelectCategory}
      selectedCategoryId={selectedCategoryId}
    />
  ) : null;

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
          cinematicQuickFiltersContent={cinematicQuickFiltersContent}
          cinematicToggleLabel={cinematicToggleLabel}
          favoriteToggleHelperText={favoriteToggleHelperText}
          favoriteToggleLabel={favoriteToggleLabel}
          favoriteVideosContent={favoriteVideosContent}
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
          onPlaybackRestoreApplied={handlePlaybackRestoreApplied}
          onPreviousVideo={handlePlayPreviousVideo}
          onToggleCinematicMode={() => void handleToggleCinematicMode()}
          onToggleFavoriteStreamer={() => void handleToggleFavoriteStreamer()}
          playbackRestore={pendingPlaybackRestore}
          playerRef={videoPlayerRef}
          playerSectionRef={playerSectionRef}
          playerStageRef={playerStageRef}
          playerViewportRef={playerViewportRef}
          selectedCategoryLabel={selectedCategory?.label}
          selectedCountryName={selectedCountryName}
          selectedVideoChannelTitle={resolvedSelectedVideo?.snippet.channelTitle}
          selectedVideoId={selectedVideoId}
          selectedVideoRankLabel={selectedVideoStageRankLabel}
          selectedVideoStatLabel={selectedVideoStatLabel}
          selectedVideoTitle={resolvedSelectedVideo?.snippet.title}
          stageActionContent={gameActionContent}
          supplementalContent={portfolioContent}
          toggleFavoriteStreamerPending={toggleFavoriteStreamerMutation.isPending}
        />
        {isMobileLayout ? (
          <>
            {!isCinematicModeActive ? favoriteVideosContent : null}
            {!isCinematicModeActive ? filterSummaryContent : null}
            {!isCinematicModeActive ? chartContent : null}
            <CommunityPanel
              selectedVideoId={selectedVideoId}
              selectedVideoTitle={resolvedSelectedVideo?.snippet.title}
            />
          </>
        ) : (
          <>
            {!isCinematicModeActive ? favoriteVideosContent : null}
            {!isCinematicModeActive ? filterSummaryContent : null}
            {!isCinematicModeActive ? chartContent : null}
            <CommunityPanel
              selectedVideoId={selectedVideoId}
              selectedVideoTitle={resolvedSelectedVideo?.snippet.title}
            />
          </>
        )}
      </main>
      <FilterModal
        detailCategoryHelperText={detailCategoryHelperText}
        detailCategoryOptions={detailCategoryOptions}
        isOpen={isFilterModalOpen}
        isVideoCategoriesError={isVideoCategoriesError}
        isVideoCategoriesLoading={isVideoCategoriesLoading}
        mainVideoCategories={mainVideoCategories}
        onChangeRegion={(regionCode) => handleSelectRegion(regionCode as RegionCode)}
        onClose={closeFilterModal}
        onComplete={handleCompleteFilterSelection}
        onSelectCategory={handleSelectCategory}
        regionOptions={regionOptions}
        selectedCategoryId={selectedCategory?.id ?? ''}
        selectedCategoryLabel={selectedCategory?.label}
        selectedCountryName={selectedCountryName}
        selectedRegionCode={selectedRegionCode}
      />
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
      <GameTradeModal
        confirmLabel={`${normalizedBuyQuantity}개 매수`}
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

          setBuyQuantity(maxBuyQuantity > 0 ? Math.min(Math.max(1, quantity), maxBuyQuantity) : Math.max(1, quantity));
        }}
        onClose={() => setActiveTradeModal(null)}
        onConfirm={() => void handleBuyCurrentVideo()}
        quantity={normalizedBuyQuantity}
        quantityLabel={`수량 ${normalizedBuyQuantity}개`}
        thumbnailUrl={selectedVideoTradeThumbnailUrl}
        title={selectedGameActionTitle}
        totalPointsLabel={`총 매수 ${formatPoints(totalSelectedVideoBuyPoints ?? (selectedVideoUnitPricePoints ?? 0))}`}
        unitPointsLabel={formatPoints(selectedVideoUnitPricePoints ?? 0)}
      />
      <GameTradeModal
        confirmLabel={`${normalizedSellQuantity}개 매도`}
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

          setSellQuantity(maxSellQuantity > 0 ? Math.min(Math.max(1, quantity), maxSellQuantity) : Math.max(1, quantity));
        }}
        onClose={() => setActiveTradeModal(null)}
        onConfirm={() => void handleSellCurrentVideo()}
        quantity={normalizedSellQuantity}
        quantityLabel={`수량 ${normalizedSellQuantity}개`}
        thumbnailUrl={selectedVideoTradeThumbnailUrl}
        title={selectedGameActionTitle}
        totalPointsLabel={`예상 정산 ${formatPoints(selectedVideoSellSummary.settledPoints)}`}
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
