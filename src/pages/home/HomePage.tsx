import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeaturedVideoSection } from '../../components/VideoList/VideoList';
import type { VideoPlayerHandle } from '../../components/VideoPlayer/VideoPlayer';
import AppHeader from './sections/AppHeader';
import { ChartPanel, CommunityPanel, FavoriteVideosPanel } from './sections/ContentPanels';
import { CinematicQuickFilters, FilterModal, FilterSummaryPanel } from './sections/FilterPanels';
import GameRankHistoryModal from './sections/GameRankHistoryModal';
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
  useSellGamePosition,
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

function formatSignedPoints(points?: number | null) {
  const normalizedPoints = points ?? 0;

  if (normalizedPoints > 0) {
    return `+${formatPoints(normalizedPoints)}`;
  }

  if (normalizedPoints < 0) {
    return `-${formatPoints(Math.abs(normalizedPoints))}`;
  }

  return formatPoints(0);
}

function formatRank(rank?: number | null, options?: { chartOut?: boolean }) {
  if (options?.chartOut) {
    return '차트 아웃';
  }

  return typeof rank === 'number' ? `${rank}위` : '집계 중';
}

function formatRemainingHoldSeconds(remainingSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.ceil(remainingSeconds));
  const minutes = Math.floor(normalizedSeconds / 60);
  const seconds = normalizedSeconds % 60;

  if (minutes === 0) {
    return `${seconds}초`;
  }

  return `${minutes}분 ${seconds}초`;
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
) {
  if (!currentGameSeason || !selectedVideoMarketEntry) {
    return null;
  }

  return currentGameSeason.wallet.balancePoints - selectedVideoMarketEntry.currentPricePoints;
}

function getBuyRemainingPointsText(
  currentGameSeason?: GameCurrentSeason,
  selectedVideoMarketEntry?: GameMarketVideo,
) {
  const buyBalanceDeltaPoints = getBuyBalanceDeltaPoints(currentGameSeason, selectedVideoMarketEntry);

  return typeof buyBalanceDeltaPoints === 'number' && buyBalanceDeltaPoints >= 0
    ? `구매 후 ${formatPointBalance(buyBalanceDeltaPoints)}가 남습니다.`
    : null;
}

function getBuyShortfallPointsText(
  currentGameSeason?: GameCurrentSeason,
  selectedVideoMarketEntry?: GameMarketVideo,
) {
  const buyBalanceDeltaPoints = getBuyBalanceDeltaPoints(currentGameSeason, selectedVideoMarketEntry);

  return typeof buyBalanceDeltaPoints === 'number' && buyBalanceDeltaPoints < 0
    ? `${formatPointBalance(Math.abs(buyBalanceDeltaPoints))}가 부족합니다.`
    : null;
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
  const [historyPlaybackVideo, setHistoryPlaybackVideo] = useState<YouTubeVideoItem | null>(null);
  const [historyPlaybackLoadingVideoId, setHistoryPlaybackLoadingVideoId] = useState<string | null>(null);
  const playerStageRef = useRef<HTMLDivElement | null>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle | null>(null);
  const playerSectionRef = useRef<HTMLElement | null>(null);
  const playerViewportRef = useRef<HTMLDivElement | null>(null);
  const nextPlaybackRestoreIdRef = useRef(0);
  const handledPlaybackRestoreSignatureRef = useRef<string | null>(null);
  const lastPersistedPlaybackSecondsRef = useRef<Record<string, number>>({});
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
  } = useMyGamePositions(accessToken, '', shouldLoadGame && activeGameTab === 'history');
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
    data: selectedVideoRankHistory,
    error: selectedVideoRankHistoryError,
    isLoading: isVideoRankHistoryLoading,
  } = useVideoRankHistory(
    currentGameSeason?.regionCode ?? VIDEO_GAME_REGION_CODE,
    selectedVideoRankHistoryVideoId ?? undefined,
    isApiConfigured && Boolean(selectedVideoRankHistoryVideoId),
  );
  const buyGamePositionMutation = useBuyGamePosition(accessToken);
  const sellGamePositionMutation = useSellGamePosition(accessToken);

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
  const selectedVideoOpenPosition = selectedVideoId
    ? openGamePositions.find((position) => position.videoId === selectedVideoId)
    : undefined;
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
  const selectedVideoCurrentChartRank =
    selectedVideoMarketEntry?.currentRank ??
    selectedVideoTrendSignal?.currentRank ??
    selectedVideoOpenPosition?.currentRank;
  const selectedVideoIsChartOut =
    selectedVideoMarketEntry || selectedVideoTrendSignal
      ? false
      : (selectedVideoOpenPosition?.chartOut ?? false) || (selectedHistoricalPosition?.chartOut ?? false);
  const selectedVideoRankLabel = formatSelectedVideoRankLabel(
    selectedCountryName,
    selectedVideoCurrentChartRank,
    {
      chartOut: selectedVideoIsChartOut,
    },
  );
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

  const handleSellPosition = useCallback(
    async (position: GamePosition) => {
      try {
        const result = await sellGamePositionMutation.mutateAsync(position.id);
        setGameActionStatus(
          `${position.title} 포지션을 ${formatRank(result.sellRank)} / ${formatPoints(
            result.sellPricePoints,
          )} / 손익률 ${formatSignedProfitRate(result.pnlPoints, result.stakePoints)} 기준으로 정리했어요.`,
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
          error instanceof Error ? error.message : '매도에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        );
      }
    },
    [logout, sellGamePositionMutation],
  );

  const handleBuyCurrentVideo = useCallback(async () => {
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

    const buyShortfallMessage = getBuyShortfallPointsText(currentGameSeason, selectedVideoMarketEntry);

    if (!selectedVideoMarketEntry.canBuy) {
      setGameActionStatus(
        buyShortfallMessage ?? selectedVideoMarketEntry.buyBlockedReason ?? '지금은 매수할 수 없습니다.',
      );
      return;
    }

    try {
      await buyGamePositionMutation.mutateAsync({
        categoryId: '0',
        regionCode: currentGameSeason.regionCode,
        stakePoints: selectedVideoMarketEntry.currentPricePoints,
        videoId: selectedVideoId,
      });
      setGameActionStatus(
        `${formatPoints(selectedVideoMarketEntry.currentPricePoints)}로 ${selectedVideoMarketEntry.currentRank}위 영상을 매수했어요.`,
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
    }
  }, [
    authStatus,
    buyGamePositionMutation,
    currentGameSeason,
    currentGameSeasonError,
    gameSeasonRegionMismatch,
    logout,
    selectedVideoId,
    selectedVideoMarketEntry,
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
    (position: GamePosition) => {
      scrollToPlayerStage();
      handleSelectVideo(position.videoId, gamePortfolioSection.categoryId);
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

  const selectedVideoHoldRemainingSeconds = selectedVideoOpenPosition
    ? getRemainingHoldSeconds(selectedVideoOpenPosition)
    : 0;
  const myLeaderboardEntry = gameLeaderboard.find((entry) => entry.me);
  const topLeaderboardEntries = gameLeaderboard.slice(0, 10);
  const buyRemainingPointsText = getBuyRemainingPointsText(currentGameSeason, selectedVideoMarketEntry);
  const buyShortfallPointsText = getBuyShortfallPointsText(currentGameSeason, selectedVideoMarketEntry);
  const currentVideoGameHelperText =
    !canShowGameActions
      ? !isGameRegionSelected
        ? '랭킹 게임은 대한민국 전체 카테고리에서만 가능합니다.'
        : '매수/매도는 전체 카테고리에서만 가능합니다.'
      : authStatus !== 'authenticated'
      ? '로그인하면 지금 보는 영상도 바로 게임 포지션으로 담을 수 있습니다.'
      : selectedVideoOpenPosition
        ? '현재 보유 중인 포지션입니다.'
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
  const currentVideoGamePriceSummary = selectedVideoOpenPosition ? (
    <div className="app-shell__game-price-strip" aria-label="선택한 영상 가격 정보">
      <span className="app-shell__game-price-chip">
        현재 {formatRank(selectedVideoOpenPosition.currentRank, {
          chartOut: selectedVideoOpenPosition.chartOut,
        })}
      </span>
      <span className="app-shell__game-price-chip">매수가 {formatPoints(selectedVideoOpenPosition.stakePoints)}</span>
      <span className="app-shell__game-price-chip">
        현재가 {formatMaybePoints(selectedVideoOpenPosition.currentPricePoints)}
      </span>
      <span
        className="app-shell__game-price-chip"
        data-tone={getPointTone(selectedVideoOpenPosition.profitPoints)}
      >
        손익률{' '}
        {formatSignedProfitRate(
          selectedVideoOpenPosition.profitPoints,
          selectedVideoOpenPosition.stakePoints,
        )}
      </span>
    </div>
  ) : selectedVideoMarketEntry ? (
    <div className="app-shell__game-price-strip" aria-label="선택한 영상 현재 가격">
      <span className="app-shell__game-price-chip">
        현재 {formatRank(selectedVideoMarketEntry.currentRank)}
      </span>
      <span className="app-shell__game-price-chip">
        가격 {formatPoints(selectedVideoMarketEntry.currentPricePoints)}
      </span>
    </div>
  ) : null;
  const isSelectedVideoSellDisabled =
    !selectedVideoOpenPosition ||
    selectedVideoHoldRemainingSeconds > 0 ||
    (sellGamePositionMutation.isPending && sellGamePositionMutation.variables === selectedVideoOpenPosition.id);
  const isSelectedVideoBuyDisabled =
    !selectedVideoId ||
    authStatus !== 'authenticated' ||
    buyGamePositionMutation.isPending ||
    !selectedVideoMarketEntry ||
    !selectedVideoMarketEntry.canBuy ||
    !currentGameSeason;
  const buyActionTitle =
    authStatus !== 'authenticated'
      ? '로그인 후 매수할 수 있습니다.'
      : selectedVideoMarketEntry?.canBuy
        ? buyRemainingPointsText
          ? buyRemainingPointsText
          : `${formatPoints(selectedVideoMarketEntry.currentPricePoints)}로 현재 영상을 매수합니다.`
        : buyShortfallPointsText ??
          selectedVideoMarketEntry?.buyBlockedReason ??
          (currentGameSeason ? '현재 영상은 게임 거래 대상이 아닙니다.' : '활성 시즌이 없습니다.');
  const gameActionContent = null;
  const selectedGameActionTitle =
    selectedVideoOpenPosition?.title ?? resolvedSelectedVideo?.snippet.title ?? '선택한 영상';
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
                    <p className="app-shell__game-leaderboard-meta">
                      실현 금액{' '}
                      <span data-tone={getPointTone(entry.realizedPnlPoints)}>
                        {formatSignedPoints(entry.realizedPnlPoints)}
                      </span>{' '}
                    </p>
                    <p className="app-shell__game-leaderboard-meta">
                      평가 금액{' '}
                      <span data-tone={getPointTone(entry.unrealizedPnlPoints)}>
                        {formatSignedPoints(entry.unrealizedPnlPoints)}
                      </span>
                    </p>
                    <p className="app-shell__game-leaderboard-meta">
                      보유 {entry.openPositionCount}개
                    </p>
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
                  <p className="app-shell__game-leaderboard-meta">
                    실현 금액{' '}
                    <span data-tone={getPointTone(myLeaderboardEntry.realizedPnlPoints)}>
                      {formatSignedPoints(myLeaderboardEntry.realizedPnlPoints)}
                    </span>{' '}
                  </p>
                  <p className="app-shell__game-leaderboard-meta">
                    평가 금액{' '}
                    <span data-tone={getPointTone(myLeaderboardEntry.unrealizedPnlPoints)}>
                      {formatSignedPoints(myLeaderboardEntry.unrealizedPnlPoints)}
                    </span>
                  </p>
                  <p className="app-shell__game-leaderboard-meta">
                    보유 {myLeaderboardEntry.openPositionCount}개
                  </p>
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
    openGamePositions.length > 0 ? (
      <ul className="app-shell__game-positions">
        {openGamePositions.map((position) => {
          const remainingHoldSeconds = getRemainingHoldSeconds(position);
          const isSelectedPosition = position.videoId === selectedVideoId;
          const isPendingSell =
            sellGamePositionMutation.isPending && sellGamePositionMutation.variables === position.id;

          return (
            <li
              key={position.id}
              className="app-shell__game-position"
              data-selected={isSelectedPosition}
            >
              <button
                className="app-shell__game-position-select"
                onClick={() => handleSelectGamePositionVideo(position)}
                type="button"
              >
                <img
                  alt=""
                  className="app-shell__game-position-thumb"
                  loading="lazy"
                  src={position.thumbnailUrl}
                />
                <div className="app-shell__game-position-copy">
                  <p className="app-shell__game-position-title">{position.title}</p>
                  <p className="app-shell__game-position-meta">
                    매수 금액 {formatPoints(position.stakePoints)} · 현재 순위{' '}
                    <span className="app-shell__game-rank-emphasis">
                      {formatRank(position.currentRank, {
                        chartOut: position.chartOut,
                      })}
                    </span>
                  </p>
                  <p className="app-shell__game-position-meta">
                    평가 금액 {formatMaybePoints(position.currentPricePoints)} · 손익률{' '}
                    <span data-tone={getPointTone(position.profitPoints)}>
                      {formatSignedProfitRate(position.profitPoints, position.stakePoints)}
                    </span>
                  </p>
                </div>
              </button>
              <div className="app-shell__game-position-side">
                {canShowGameActions ? (
                  <button
                    className="app-shell__game-position-sell"
                    disabled={remainingHoldSeconds > 0 || isPendingSell}
                    onClick={() => void handleSellPosition(position)}
                    title={
                      remainingHoldSeconds > 0
                        ? `최소 보유 시간까지 ${formatRemainingHoldSeconds(remainingHoldSeconds)} 남았습니다.`
                        : '포지션을 매도합니다.'
                    }
                    type="button"
                  >
                    {isPendingSell ? '매도 중...' : '매도'}
                  </button>
                ) : null}
                <span className="app-shell__game-position-hold">
                  {canShowGameActions
                    ? remainingHoldSeconds > 0
                      ? `${formatRemainingHoldSeconds(remainingHoldSeconds)} 남음`
                      : '지금 매도 가능'
                    : !isGameRegionSelected
                      ? '대한민국 전체 카테고리에서 매도 가능'
                      : remainingHoldSeconds > 0
                        ? `${formatRemainingHoldSeconds(remainingHoldSeconds)} 후 전체에서 매도 가능`
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
                  {currentGameSeason ? formatPoints(currentGameSeason.wallet.totalAssetPoints) : '-'}
                </span>
              </span>
              <span className="app-shell__game-panel-metric">
                <span className="app-shell__game-panel-metric-label">
                  {activeGameTab === 'leaderboard'
                    ? '내 순위'
                    : activeGameTab === 'history'
                      ? '거래'
                      : '보유'}
                </span>
                <span className="app-shell__game-panel-metric-value">
                  {activeGameTab === 'leaderboard'
                    ? myLeaderboardEntry
                      ? `${myLeaderboardEntry.rank}위`
                      : '-'
                    : activeGameTab === 'history'
                      ? isGameHistoryLoading
                        ? '...'
                        : `${gameHistoryPositions.length}건`
                      : `${openGamePositions.length}/${currentGameSeason?.maxOpenPositions ?? '-'}`}
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
            {currentVideoGamePriceSummary}
            {gameActionStatus ? <p className="app-shell__game-panel-status">{gameActionStatus}</p> : null}
            {selectedVideoId ? (
              <div className="app-shell__game-panel-actions">
                <div className="app-shell__game-panel-actions-copy">
                  <p className="app-shell__game-panel-actions-eyebrow">
                    {selectedVideoOpenPosition ? 'Selected Position' : 'Selected Video'}
                  </p>
                  <p className="app-shell__game-panel-actions-title">{selectedGameActionTitle}</p>
                </div>
                <div className="app-shell__game-panel-actions-buttons">
                  {selectedVideoOpenPosition ? (
                    <>
                      <button
                        className="app-shell__game-panel-action"
                        disabled={isChartActionDisabled}
                        onClick={() => {
                          setSelectedVideoRankHistoryVideoId(null);
                          setSelectedRankHistoryPosition(selectedVideoOpenPosition);
                        }}
                        title={
                          !canShowGameActions
                            ? '대한민국 전체 카테고리에서만 차트를 볼 수 있습니다.'
                            : '이 포지션의 랭킹 차트를 엽니다.'
                        }
                        type="button"
                      >
                        차트
                      </button>
                      <button
                        className="app-shell__game-panel-action"
                        data-variant="sell"
                        disabled={!canShowGameActions || isSelectedVideoSellDisabled}
                        onClick={() => void handleSellPosition(selectedVideoOpenPosition)}
                        title={
                          !canShowGameActions
                            ? '전체 카테고리에서만 매도할 수 있습니다.'
                            : selectedVideoHoldRemainingSeconds > 0
                              ? `최소 보유 시간까지 ${formatRemainingHoldSeconds(selectedVideoHoldRemainingSeconds)} 남았습니다.`
                              : '현재 보유 중인 포지션을 정리합니다.'
                        }
                        type="button"
                      >
                        {sellGamePositionMutation.isPending &&
                        sellGamePositionMutation.variables === selectedVideoOpenPosition.id
                          ? '매도 중...'
                          : '매도'}
                      </button>
                    </>
                  ) : (
                    <>
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
                        onClick={() => void handleBuyCurrentVideo()}
                        title={
                          !canShowGameActions
                            ? '전체 카테고리에서만 매수할 수 있습니다.'
                            : buyActionTitle
                        }
                        type="button"
                      >
                        {buyGamePositionMutation.isPending ? '매수 중...' : '매수'}
                      </button>
                    </>
                  )}
                </div>
              </div>
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
          selectedVideoRankLabel={selectedVideoRankLabel}
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
