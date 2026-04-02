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
  RESTORED_PLAYBACK_QUEUE_ID,
  findPlaybackQueueIdForVideo,
  formatVideoViewCount,
  getVideoThumbnailUrl,
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
} from '../../constants/videoCategories';
import { useAuth } from '../../features/auth/useAuth';
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

function HomePage() {
  const { accessToken, isLoggingOut, logout, status: authStatus, user } = useAuth();
  const [pendingPlaybackRestore, setPendingPlaybackRestore] = useState<PendingPlaybackRestore | null>(null);
  const [isManualPlaybackSavePending, setIsManualPlaybackSavePending] = useState(false);
  const [manualPlaybackSaveStatus, setManualPlaybackSaveStatus] = useState<string | null>(null);
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
    isDarkMode,
    isDesktopCinematicMode,
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
    shouldLoadFavorites && favoriteStreamers.length > 0,
  );
  const toggleFavoriteStreamerMutation = useToggleFavoriteStreamer(accessToken);
  const favoriteStreamerVideoSection =
    favoriteStreamers.length > 0
      ? mergeSections(favoriteStreamerVideosData?.pages) ?? FAVORITE_STREAMER_VIDEO_SECTION
      : undefined;
  const favoriteStreamerVideoIds = favoriteStreamerVideoSection?.items.map((item) => item.id) ?? [];
  const isAllCategorySelected = selectedCategory?.id === ALL_VIDEO_CATEGORY_ID;

  const {
    data: trendSignalsByVideoId = {},
    isLoading: isTrendSignalsLoading,
    isError: isTrendSignalsError,
  } = useVideoTrendSignals(
    selectedRegionCode,
    selectedCategory?.id,
    selectedSectionVideoIds,
    isApiConfigured,
  );
  const {
    data: favoriteTrendSignalsByVideoId = {},
    isLoading: isFavoriteTrendSignalsLoading,
    isError: isFavoriteTrendSignalsError,
  } = useVideoTrendSignals(
    selectedRegionCode,
    ALL_VIDEO_CATEGORY_ID,
    favoriteStreamerVideoIds,
    shouldLoadFavorites && favoriteStreamerVideoIds.length > 0,
  );
  const {
    data: realtimeSurgingData,
    isLoading: isRealtimeSurgingLoading,
    isError: isRealtimeSurgingError,
  } = useRealtimeSurging(selectedRegionCode, isApiConfigured && isAllCategorySelected);
  const realtimeSurgingSignalsByVideoId = Object.fromEntries(
    (realtimeSurgingData?.items ?? []).map((signal) => [signal.videoId, signal]),
  );
  const combinedTrendSignalsByVideoId = {
    ...trendSignalsByVideoId,
    ...favoriteTrendSignalsByVideoId,
    ...realtimeSurgingSignalsByVideoId,
  };
  const realtimeSurgingSection = buildRealtimeSurgingSection(isAllCategorySelected, realtimeSurgingData);
  const realtimeSurgingEmptyMessage =
    isAllCategorySelected && !isChartLoading && !isRealtimeSurgingLoading && !isRealtimeSurgingError
      ? `아직 +${realtimeSurgingData?.rankChangeThreshold ?? 5} 이상 급상승한 영상이 없습니다.`
      : undefined;
  const restoredPlaybackVideo = user?.lastPlaybackProgress
    ? mapPlaybackProgressToVideoItem(user.lastPlaybackProgress)
    : undefined;
  const combinedPlayableItems = mergeUniqueVideoItems(
    realtimeSurgingSection?.items,
    selectedPlaybackSection?.items,
    favoriteStreamerVideoSection?.items,
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

  useEffect(() => {
    if (authStatus === 'authenticated') {
      return;
    }

    handledPlaybackRestoreSignatureRef.current = null;
    lastPersistedPlaybackSecondsRef.current = {};
    setIsManualPlaybackSavePending(false);
    setManualPlaybackSaveStatus(null);
    setPendingPlaybackRestore(null);
  }, [authStatus]);

  useEffect(() => {
    setManualPlaybackSaveStatus(null);
  }, [selectedVideoId]);

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
      realtimeSurgingSection,
      selectedSection: selectedPlaybackSection,
    });

    if (matchedQueueId) {
      updateActivePlaybackQueueId(matchedQueueId);
    }
  }, [
    activePlaybackQueueId,
    favoriteStreamerVideoSection,
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

  const chartContent = (
    <ChartPanel
      chartErrorMessage={chartErrorMessage}
      featuredSection={realtimeSurgingSection}
      featuredSectionEmptyMessage={realtimeSurgingEmptyMessage}
      hasNextPage={hasNextPage}
      hasResolvedTrendSignals={isApiConfigured && !isTrendSignalsLoading && !isTrendSignalsError}
      isChartError={isChartError}
      isChartLoading={isChartLoading}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => void fetchNextPage()}
      onSelectVideo={handleSelectVideo}
      realtimeSurgingSignalsByVideoId={realtimeSurgingSignalsByVideoId}
      section={selectedPlaybackSection}
      selectedCategoryLabel={selectedCategory?.label}
      selectedVideoId={selectedVideoId}
      trendSignalsByVideoId={combinedTrendSignalsByVideoId}
    />
  );

  const cinematicChartContent = (
    <ChartPanel
      chartErrorMessage={chartErrorMessage}
      className="app-shell__panel--chart-cinematic"
      featuredSection={realtimeSurgingSection}
      featuredSectionEmptyMessage={realtimeSurgingEmptyMessage}
      hasNextPage={hasNextPage}
      hasResolvedTrendSignals={isApiConfigured && !isTrendSignalsLoading && !isTrendSignalsError}
      isChartError={isChartError}
      isChartLoading={isChartLoading}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => void fetchNextPage()}
      onSelectVideo={handleSelectVideo}
      realtimeSurgingSignalsByVideoId={realtimeSurgingSignalsByVideoId}
      section={selectedPlaybackSection}
      selectedCategoryLabel={selectedCategory?.label}
      selectedVideoId={selectedVideoId}
      trendSignalsByVideoId={combinedTrendSignalsByVideoId}
    />
  );

  const favoriteVideosContent = (
    <FavoriteVideosPanel
      authStatus={authStatus}
      favoriteStreamerCount={favoriteStreamers.length}
      favoriteStreamerVideoErrorMessage={favoriteStreamerVideoErrorMessage}
      favoriteStreamerVideoSection={favoriteStreamerVideoSection}
      favoriteStreamers={favoriteStreamers}
      favoriteTrendSignalsByVideoId={favoriteTrendSignalsByVideoId}
      hasNextPage={hasNextFavoriteStreamerVideosPage}
      hasResolvedTrendSignals={isApiConfigured && !isFavoriteTrendSignalsLoading && !isFavoriteTrendSignalsError}
      isDesktopCinematicMode={isDesktopCinematicMode}
      isFavoriteStreamerVideosError={isFavoriteStreamerVideosError}
      isFavoriteStreamerVideosLoading={isFavoriteStreamerVideosLoading}
      isFavoriteStreamersError={isFavoriteStreamersError}
      isFavoriteStreamersLoading={isFavoriteStreamersLoading}
      isFetchingNextPage={isFetchingNextFavoriteStreamerVideosPage}
      onLoadMore={() => void fetchNextFavoriteStreamerVideosPage()}
      onSelectVideo={handleSelectVideo}
      selectedCountryName={selectedCountryName}
      selectedVideoId={selectedVideoId}
      trendSignalsByVideoId={combinedTrendSignalsByVideoId}
    />
  );

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

  const cinematicQuickFiltersContent = isDesktopCinematicMode ? (
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
          isDesktopCinematicMode={isDesktopCinematicMode}
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
          toggleFavoriteStreamerPending={toggleFavoriteStreamerMutation.isPending}
        />
        {isMobileLayout ? (
          <>
            {filterSummaryContent}
            {favoriteVideosContent}
            {chartContent}
            <CommunityPanel
              selectedVideoId={selectedVideoId}
              selectedVideoTitle={selectedVideo?.snippet.title}
            />
          </>
        ) : (
          <>
            {!isDesktopCinematicMode ? filterSummaryContent : null}
            {!isDesktopCinematicMode ? favoriteVideosContent : null}
            {!isDesktopCinematicMode ? chartContent : null}
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
