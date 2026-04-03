import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VideoPlayerHandle } from '../../components/VideoPlayer/VideoPlayer';
import AppHeader from './sections/AppHeader';
import { ChartPanel, CommunityPanel, FavoriteVideosPanel } from './sections/ContentPanels';
import { CinematicQuickFilters, FilterModal, FilterSummaryPanel } from './sections/FilterPanels';
import PlayerStage from './sections/PlayerStage';
import useAppPreferences from './hooks/useAppPreferences';
import useLogoutOnUnauthorized from './hooks/useLogoutOnUnauthorized';
import usePlaybackQueue from './hooks/usePlaybackQueue';
import {
  buildRealtimeSurgingSection,
  DEFAULT_CATEGORY_ID,
  FAVORITE_STREAMER_VIDEO_SECTION,
  GAME_PORTFOLIO_QUEUE_ID,
  RESTORED_PLAYBACK_QUEUE_ID,
  findPlaybackQueueIdForVideo,
  formatVideoViewCount,
  getVideoThumbnailUrl,
  mapGamePositionToVideoItem,
  mergeSections,
  mergeUniqueVideoItems,
  mapPlaybackProgressToVideoItem,
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
  useGameMarket,
  useMyGamePositions,
  useSellGamePosition,
} from '../../features/game/queries';
import type { GamePosition } from '../../features/game/types';
import { upsertPlaybackProgress } from '../../features/playback/api';
import {
  useFavoriteStreamerVideos,
  useFavoriteStreamers,
  useToggleFavoriteStreamer,
} from '../../features/favorites/queries';
import { useRealtimeSurging, useVideoTrendSignals } from '../../features/trending/queries';
import { usePopularVideosByCategory, useVideoCategories } from '../../features/youtube/queries';
import { ApiRequestError, isApiConfigured } from '../../lib/api';
import '../../styles/app.css';

const GAME_STAKE_POINTS = 1_000;
const pointsFormatter = new Intl.NumberFormat('ko-KR');
const seasonDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
});

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

function HomePage() {
  const { accessToken, isLoggingOut, logout, status: authStatus, user } = useAuth();
  const [pendingPlaybackRestore, setPendingPlaybackRestore] = useState<PendingPlaybackRestore | null>(null);
  const [isManualPlaybackSavePending, setIsManualPlaybackSavePending] = useState(false);
  const [manualPlaybackSaveStatus, setManualPlaybackSaveStatus] = useState<string | null>(null);
  const [activeGameTab, setActiveGameTab] = useState<'positions' | 'leaderboard'>('positions');
  const [gameActionStatus, setGameActionStatus] = useState<string | null>(null);
  const [gameClock, setGameClock] = useState(() => Date.now());
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
  const favoriteStreamerVideoIds = favoriteStreamerVideoSection?.items.map((item) => item.id) ?? [];
  const shouldShowSelectedCategoryTrendSignals = supportsVideoTrendSignals(
    selectedCategory?.id,
    selectedRegionCode,
  );
  const shouldShowAllCategoryTrendSignals = supportsVideoTrendSignals(
    ALL_VIDEO_CATEGORY_ID,
    selectedRegionCode,
  );

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
  } = useRealtimeSurging(selectedRegionCode, isApiConfigured && shouldShowAllCategoryTrendSignals);
  const realtimeSurgingSignalsByVideoId = Object.fromEntries(
    (realtimeSurgingData?.items ?? []).map((signal) => [signal.videoId, signal]),
  );
  const chartTrendSignalsByVideoId = shouldShowSelectedCategoryTrendSignals
    ? {
        ...trendSignalsByVideoId,
        ...(isAllCategorySelected ? realtimeSurgingSignalsByVideoId : {}),
      }
    : {};
  const realtimeSurgingSection = buildRealtimeSurgingSection(
    shouldShowAllCategoryTrendSignals,
    realtimeSurgingData,
  );
  const realtimeSurgingEmptyMessage =
    shouldShowAllCategoryTrendSignals &&
    !isChartLoading &&
    !isRealtimeSurgingLoading &&
    !isRealtimeSurgingError
      ? `아직 +${realtimeSurgingData?.rankChangeThreshold ?? 5} 이상 급상승한 영상이 없습니다.`
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
    selectedPlaybackSection?.items,
    favoriteStreamerVideoSection?.items,
    gamePortfolioSection.items,
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
  const selectedVideoStatLabel = formatVideoViewCount(selectedVideo?.statistics?.viewCount);
  const selectedChannelId = selectedVideo?.snippet.channelId?.trim();
  const selectedVideoOpenPosition = selectedVideoId
    ? openGamePositions.find((position) => position.videoId === selectedVideoId)
    : undefined;
  const selectedVideoMarketEntry = selectedVideoId
    ? gameMarket.find((marketVideo) => marketVideo.videoId === selectedVideoId)
    : undefined;
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

  useLogoutOnUnauthorized(favoriteStreamersError, logout);
  useLogoutOnUnauthorized(favoriteStreamerVideosError, logout);
  useLogoutOnUnauthorized(currentGameSeasonError, logout);
  useLogoutOnUnauthorized(gameLeaderboardError, logout);
  useLogoutOnUnauthorized(gameMarketError, logout);
  useLogoutOnUnauthorized(openGamePositionsError, logout);

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
  }, [authStatus]);

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
        realtimeSurgingSection,
        selectedSection: selectedPlaybackSection,
      }) ?? RESTORED_PLAYBACK_QUEUE_ID,
    );
  }, [
    authStatus,
    favoriteStreamerVideoSection,
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
          `${position.title} 포지션을 ${formatRank(result.sellRank)} / ${formatSignedPoints(result.pnlPoints)} 기준으로 정리했어요.`,
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

    if (!selectedVideoMarketEntry.canBuy) {
      setGameActionStatus(selectedVideoMarketEntry.buyBlockedReason ?? '지금은 매수할 수 없습니다.');
      return;
    }

    try {
      await buyGamePositionMutation.mutateAsync({
        categoryId: '0',
        regionCode: currentGameSeason.regionCode,
        stakePoints: GAME_STAKE_POINTS,
        videoId: selectedVideoId,
      });
      setGameActionStatus(
        `${formatPoints(GAME_STAKE_POINTS)}로 ${selectedVideoMarketEntry.currentRank}위 영상을 매수했어요.`,
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
    if (authStatus !== 'authenticated' || !selectedVideo || !selectedChannelId) {
      return;
    }

    try {
      await toggleFavoriteStreamerMutation.mutateAsync({
        channelId: selectedChannelId,
        channelTitle: selectedVideo.snippet.channelTitle,
        isFavorited: isSelectedChannelFavorited,
        thumbnailUrl: selectedVideo.snippet.thumbnails.high.url || null,
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

  const handleSelectGamePositionVideo = useCallback(
    (position: GamePosition) => {
      handleSelectVideo(position.videoId, gamePortfolioSection.categoryId);
    },
    [gamePortfolioSection.categoryId, handleSelectVideo],
  );

  const selectedVideoHoldRemainingSeconds = selectedVideoOpenPosition
    ? getRemainingHoldSeconds(selectedVideoOpenPosition)
    : 0;
  const myLeaderboardEntry = gameLeaderboard.find((entry) => entry.me);
  const topLeaderboardEntries = gameLeaderboard.slice(0, 10);
  const currentVideoGameHelperText =
    !canShowGameActions
      ? !isGameRegionSelected
        ? selectedVideoOpenPosition
          ? `매수 ${formatRank(selectedVideoOpenPosition.buyRank)} · 현재 ${formatRank(
              selectedVideoOpenPosition.currentRank,
              { chartOut: selectedVideoOpenPosition.chartOut },
            )} · 손익 ${formatSignedPoints(
              selectedVideoOpenPosition.profitPoints,
            )} · 랭킹 게임은 대한민국 전체 카테고리에서만 가능합니다.`
          : '랭킹 게임은 대한민국 전체 카테고리에서만 가능합니다.'
        : selectedVideoOpenPosition
          ? `매수 ${formatRank(selectedVideoOpenPosition.buyRank)} · 현재 ${formatRank(
              selectedVideoOpenPosition.currentRank,
              { chartOut: selectedVideoOpenPosition.chartOut },
            )} · 손익 ${formatSignedPoints(
              selectedVideoOpenPosition.profitPoints,
            )} · 매수/매도는 전체 카테고리에서만 가능합니다.`
          : '매수/매도는 전체 카테고리에서만 가능합니다.'
      : authStatus !== 'authenticated'
      ? '로그인하면 지금 보는 영상도 바로 게임 포지션으로 담을 수 있습니다.'
      : selectedVideoOpenPosition
        ? `매수 ${formatRank(selectedVideoOpenPosition.buyRank)} · 현재 ${formatRank(
            selectedVideoOpenPosition.currentRank,
            { chartOut: selectedVideoOpenPosition.chartOut },
          )} · 손익 ${formatSignedPoints(selectedVideoOpenPosition.profitPoints)}`
        : selectedVideoMarketEntry
          ? selectedVideoMarketEntry.canBuy
            ? `현재 ${formatRank(selectedVideoMarketEntry.currentRank)} · ${formatPoints(
                GAME_STAKE_POINTS,
              )}로 바로 매수할 수 있습니다.`
            : selectedVideoMarketEntry.buyBlockedReason ?? '지금은 매수할 수 없습니다.'
          : currentGameSeason
            ? gameSeasonRegionMismatch
              ? `게임 시즌은 ${currentGameSeason.regionCode} 기준으로 진행 중입니다.`
              : '현재 영상은 아직 게임 거래 대상이 아닙니다.'
            : isCurrentGameSeasonLoading
              ? '게임 시즌을 불러오는 중입니다.'
              : '다음 게임 시즌을 준비 중입니다.';
  const stageGameActionLabel =
    authStatus !== 'authenticated'
      ? '영상 매수'
      : selectedVideoOpenPosition
        ? sellGamePositionMutation.isPending && sellGamePositionMutation.variables === selectedVideoOpenPosition.id
          ? '영상 매도 중'
          : '영상 매도'
        : buyGamePositionMutation.isPending
          ? '영상 매수 중'
          : `영상 매수 ${formatPoints(GAME_STAKE_POINTS)}`;
  const isSelectedVideoSellDisabled =
    !selectedVideoOpenPosition ||
    selectedVideoHoldRemainingSeconds > 0 ||
    (sellGamePositionMutation.isPending && sellGamePositionMutation.variables === selectedVideoOpenPosition.id);
  const isStageGameActionDisabled =
    !selectedVideoId ||
    authStatus !== 'authenticated' ||
    (selectedVideoOpenPosition
      ? isSelectedVideoSellDisabled
      : buyGamePositionMutation.isPending ||
        !selectedVideoMarketEntry ||
        !selectedVideoMarketEntry.canBuy ||
        !currentGameSeason);
  const gameActionTitle =
    authStatus !== 'authenticated'
      ? '로그인 후 매수할 수 있습니다.'
      : selectedVideoOpenPosition
        ? selectedVideoHoldRemainingSeconds > 0
          ? `최소 보유 시간까지 ${formatRemainingHoldSeconds(selectedVideoHoldRemainingSeconds)} 남았습니다.`
          : '현재 보유 중인 포지션을 정리합니다.'
        : selectedVideoMarketEntry?.canBuy
          ? `${formatPoints(GAME_STAKE_POINTS)}로 현재 영상을 매수합니다.`
          : selectedVideoMarketEntry?.buyBlockedReason ??
            (currentGameSeason ? '현재 영상은 게임 거래 대상이 아닙니다.' : '활성 시즌이 없습니다.');
  const gameActionContent = selectedVideoId && isApiConfigured && canShowGameActions ? (
    <button
      aria-label={stageGameActionLabel}
      className="app-shell__stage-action-button app-shell__stage-action-button--game"
      data-variant={selectedVideoOpenPosition ? 'sell' : 'buy'}
      disabled={isStageGameActionDisabled}
      onClick={() =>
        selectedVideoOpenPosition
          ? void handleSellPosition(selectedVideoOpenPosition)
          : void handleBuyCurrentVideo()
      }
      title={gameActionTitle}
      type="button"
    >
      {(selectedVideoOpenPosition
        ? sellGamePositionMutation.isPending && sellGamePositionMutation.variables === selectedVideoOpenPosition.id
        : buyGamePositionMutation.isPending)
        ? '⋯'
        : selectedVideoOpenPosition
        ? '매도'
        : '매수'}
    </button>
  ) : null;
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
      <>
        <ol className="app-shell__game-leaderboard">
          {topLeaderboardEntries.map((entry) => (
            <li
              key={entry.userId}
              className="app-shell__game-leaderboard-item"
              data-me={entry.me}
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
                    {entry.me ? ' · 나' : ''}
                  </p>
                  <p className="app-shell__game-leaderboard-total">
                    총자산 {formatPoints(entry.totalAssetPoints)}
                  </p>
                </div>
                <p className="app-shell__game-leaderboard-meta">
                  실현 {formatSignedPoints(entry.realizedPnlPoints)} · 평가{' '}
                  {formatSignedPoints(entry.unrealizedPnlPoints)} · 보유 {entry.openPositionCount}개
                </p>
              </div>
            </li>
          ))}
        </ol>
        {myLeaderboardEntry ? (
          <section className="app-shell__game-leaderboard-pinned" aria-label="내 순위">
            <p className="app-shell__game-leaderboard-pinned-label">내 순위</p>
            <div className="app-shell__game-leaderboard-item" data-me="true">
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
                  <p className="app-shell__game-leaderboard-name">{myLeaderboardEntry.displayName} · 나</p>
                  <p className="app-shell__game-leaderboard-total">
                    총자산 {formatPoints(myLeaderboardEntry.totalAssetPoints)}
                  </p>
                </div>
                <p className="app-shell__game-leaderboard-meta">
                  실현 {formatSignedPoints(myLeaderboardEntry.realizedPnlPoints)} · 평가{' '}
                  {formatSignedPoints(myLeaderboardEntry.unrealizedPnlPoints)} · 보유{' '}
                  {myLeaderboardEntry.openPositionCount}개
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </>
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
                    매수 {formatRank(position.buyRank)} · 현재 {formatRank(position.currentRank, {
                      chartOut: position.chartOut,
                    })} ·{' '}
                    {formatSignedPoints(position.profitPoints)}
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
  const portfolioContent =
    isApiConfigured && authStatus === 'authenticated' ? (
      <div className="app-shell__game-panel">
        <div className="app-shell__game-panel-header">
          <div className="app-shell__game-panel-copy">
            <p className="app-shell__game-panel-eyebrow">Ranking Game</p>
            <h3 className="app-shell__game-panel-title">
              {currentGameSeason ? `${currentGameSeason.regionCode} 시즌` : '시즌 준비 중'}
            </h3>
          </div>
          <div className="app-shell__game-panel-metrics">
            <span className="app-shell__game-panel-metric">
              잔액 {currentGameSeason ? formatPoints(currentGameSeason.wallet.balancePoints) : '-'}
            </span>
            <span className="app-shell__game-panel-metric">
              총자산 {currentGameSeason ? formatPoints(currentGameSeason.wallet.totalAssetPoints) : '-'}
            </span>
            <span className="app-shell__game-panel-metric">
              {activeGameTab === 'leaderboard'
                ? `내 순위 ${myLeaderboardEntry ? `${myLeaderboardEntry.rank}위` : '-'}`
                : `보유 ${openGamePositions.length}/${currentGameSeason?.maxOpenPositions ?? '-'}`}
            </span>
          </div>
        </div>
        <p className="app-shell__game-panel-helper">
          {currentGameSeason
            ? `${currentVideoGameHelperText} · 종료 ${seasonDateTimeFormatter.format(
                new Date(currentGameSeason.endAt),
              )}`
            : isCurrentGameSeasonLoading
              ? '게임 시즌을 불러오는 중입니다.'
              : currentGameSeasonError instanceof Error
                ? currentGameSeasonError.message
              : '다음 게임 시즌을 준비 중입니다.'}
        </p>
        {gameActionStatus ? <p className="app-shell__game-panel-status">{gameActionStatus}</p> : null}
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
          {activeGameTab === 'positions' ? positionsContent : leaderboardContent}
        </div>
      </div>
    ) : null;

  const chartContent = (
    <ChartPanel
      chartErrorMessage={chartErrorMessage}
      featuredSection={realtimeSurgingSection}
      featuredSectionEmptyMessage={realtimeSurgingEmptyMessage}
      hasNextPage={hasNextPage}
      hasResolvedTrendSignals={hasResolvedChartTrendSignals}
      isChartError={isChartError}
      isChartLoading={isChartLoading}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => void fetchNextPage()}
      onSelectVideo={handleSelectVideo}
      realtimeSurgingSignalsByVideoId={realtimeSurgingSignalsByVideoId}
      section={selectedPlaybackSection}
      selectedCategoryLabel={selectedCategory?.label}
      selectedVideoId={selectedVideoId}
      trendSignalsByVideoId={chartTrendSignalsByVideoId}
    />
  );

  const cinematicChartContent = (
    <ChartPanel
      chartErrorMessage={chartErrorMessage}
      className="app-shell__panel--chart-cinematic"
      featuredSection={realtimeSurgingSection}
      featuredSectionEmptyMessage={realtimeSurgingEmptyMessage}
      hasNextPage={hasNextPage}
      hasResolvedTrendSignals={hasResolvedChartTrendSignals}
      isChartError={isChartError}
      isChartLoading={isChartLoading}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => void fetchNextPage()}
      onSelectVideo={handleSelectVideo}
      realtimeSurgingSignalsByVideoId={realtimeSurgingSignalsByVideoId}
      section={selectedPlaybackSection}
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
      isFavoriteStreamerVideosError={isFavoriteStreamerVideosError}
      isFavoriteStreamerVideosLoading={isFavoriteStreamerVideosLoading}
      isFavoriteStreamersError={isFavoriteStreamersError}
      isFavoriteStreamersLoading={isFavoriteStreamersLoading}
      isFetchingNextPage={isFetchingNextFavoriteStreamerVideosPage}
      onLoadMore={() => void fetchNextFavoriteStreamerVideosPage()}
      onSelectVideo={handleSelectVideo}
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
          selectedVideoChannelTitle={selectedVideo?.snippet.channelTitle}
          selectedVideoId={selectedVideoId}
          selectedVideoStatLabel={selectedVideoStatLabel}
          selectedVideoTitle={selectedVideo?.snippet.title}
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
              selectedVideoTitle={selectedVideo?.snippet.title}
            />
          </>
        ) : (
          <>
            {!isCinematicModeActive ? favoriteVideosContent : null}
            {!isCinematicModeActive ? filterSummaryContent : null}
            {!isCinematicModeActive ? chartContent : null}
            <CommunityPanel
              selectedVideoId={selectedVideoId}
              selectedVideoTitle={selectedVideo?.snippet.title}
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
    </div>
  );
}

export default HomePage;
