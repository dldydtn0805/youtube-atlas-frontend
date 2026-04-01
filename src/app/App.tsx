import { useEffect, useRef, useState } from 'react';
import CommentSection from '../components/CommentSection/CommentSection';
import GoogleLoginButton from '../components/GoogleLoginButton/GoogleLoginButton';
import SearchBar from '../components/SearchBar/SearchBar';
import VideoList from '../components/VideoList/VideoList';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import { useAuth } from '../features/auth/useAuth';
import {
  useFavoriteStreamerVideos,
  useFavoriteStreamers,
  useToggleFavoriteStreamer,
} from '../features/favorites/queries';
import {
  ALL_VIDEO_CATEGORY_ID,
  getDetailVideoCategories,
  getMainVideoCategories,
  sortVideoCategories,
} from '../constants/videoCategories';
import countryCodes from '../constants/countryCodes';
import { formatCompactCount } from '../features/trending/presentation';
import { useRealtimeSurging, useVideoTrendSignals } from '../features/trending/queries';
import type { VideoTrendSignal } from '../features/trending/types';
import { YouTubeCategorySection, YouTubeVideoItem } from '../features/youtube/types';
import { usePopularVideosByCategory, useVideoCategories } from '../features/youtube/queries';
import { ApiRequestError, isApiConfigured } from '../lib/api';
import '../styles/app.css';

const DEFAULT_REGION_CODE = 'US';
const DEFAULT_CATEGORY_ID = ALL_VIDEO_CATEGORY_ID;
const MOBILE_BREAKPOINT = 768;
const STORAGE_KEY = 'youtube-atlas-region-code';
const CINEMATIC_MODE_STORAGE_KEY = 'youtube-atlas-cinematic-mode';
const THEME_MODE_STORAGE_KEY = 'youtube-atlas-theme-mode';
const FAVORITE_STREAMER_VIDEO_SECTION: YouTubeCategorySection = {
  categoryId: 'favorite-streamers',
  description: '전체 인기 영상 중 즐겨찾기한 채널의 영상만 모았습니다.',
  items: [],
  label: '즐겨찾기 채널',
};
type RegionCode = (typeof countryCodes)[number]['code'];
type ThemeMode = 'light' | 'dark';

const SUPPORTED_REGION_CODES = new Set<string>(countryCodes.map((country) => country.code));
const sortedCountryCodes = [...countryCodes].sort((left, right) => left.name.localeCompare(right.name, 'ko'));

function isSupportedRegionCode(regionCode: string): regionCode is RegionCode {
  return SUPPORTED_REGION_CODES.has(regionCode);
}

function getInitialRegionCode(): RegionCode {
  if (typeof window === 'undefined') {
    return DEFAULT_REGION_CODE;
  }

  const storedRegionCode = window.localStorage.getItem(STORAGE_KEY);

  if (storedRegionCode && isSupportedRegionCode(storedRegionCode)) {
    return storedRegionCode;
  }

  const languageCandidates = [window.navigator.language, ...(window.navigator.languages ?? [])];

  for (const language of languageCandidates) {
    const regionCode = language.split('-')[1]?.toUpperCase();

    if (regionCode && isSupportedRegionCode(regionCode)) {
      return regionCode;
    }
  }

  return DEFAULT_REGION_CODE;
}

function getInitialCinematicMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(CINEMATIC_MODE_STORAGE_KEY) === 'true';
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedThemeMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);

  if (storedThemeMode === 'light' || storedThemeMode === 'dark') {
    return storedThemeMode;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialIsMobileLayout() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth <= MOBILE_BREAKPOINT;
}

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenCapableDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

function getFullscreenElement() {
  const fullscreenDocument = document as FullscreenCapableDocument;

  return document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null;
}

async function requestElementFullscreen(element: HTMLElement) {
  const fullscreenElement = element as FullscreenCapableElement;

  if (typeof fullscreenElement.requestFullscreen === 'function') {
    await fullscreenElement.requestFullscreen();
    return true;
  }

  if (typeof fullscreenElement.webkitRequestFullscreen === 'function') {
    await fullscreenElement.webkitRequestFullscreen();
    return true;
  }

  return false;
}

async function exitElementFullscreen() {
  const fullscreenDocument = document as FullscreenCapableDocument;

  if (typeof document.exitFullscreen === 'function') {
    await document.exitFullscreen();
    return true;
  }

  if (typeof fullscreenDocument.webkitExitFullscreen === 'function') {
    await fullscreenDocument.webkitExitFullscreen();
    return true;
  }

  return false;
}

function scrollElementToViewportCenter(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const centeredTop = window.scrollY + rect.top - Math.max((viewportHeight - rect.height) / 2, 0);

  window.scrollTo({
    top: Math.max(centeredTop, 0),
    behavior: 'smooth',
  });
}

function mergeSections(pages: YouTubeCategorySection[] | undefined) {
  if (!pages?.length) {
    return undefined;
  }

  const [firstPage, ...restPages] = pages;

  return {
    ...firstPage,
    items: [firstPage, ...restPages].flatMap((page) => page.items),
    nextPageToken: pages[pages.length - 1]?.nextPageToken,
  };
}

function createFallbackThumbnails(url: string) {
  return {
    default: { url, width: 120, height: 90 },
    medium: { url, width: 320, height: 180 },
    high: { url, width: 480, height: 360 },
  };
}

function mapTrendSignalToVideoItem(signal: VideoTrendSignal): YouTubeVideoItem {
  return {
    id: signal.videoId,
    contentDetails: {
      duration: '',
    },
    statistics: signal.currentViewCount === null ? undefined : { viewCount: String(signal.currentViewCount) },
    snippet: {
      title: signal.title ?? '',
      channelTitle: signal.channelTitle ?? '',
      channelId: signal.channelId ?? '',
      categoryId: signal.categoryId,
      thumbnails: createFallbackThumbnails(signal.thumbnailUrl ?? ''),
    },
  };
}

function mergeUniqueVideoItems(...groups: Array<YouTubeVideoItem[] | undefined>) {
  const mergedItems: YouTubeVideoItem[] = [];
  const seenVideoIds = new Set<string>();

  for (const items of groups) {
    for (const item of items ?? []) {
      if (seenVideoIds.has(item.id)) {
        continue;
      }

      seenVideoIds.add(item.id);
      mergedItems.push(item);
    }
  }

  return mergedItems;
}

function formatVideoViewCount(viewCount?: string) {
  if (!viewCount) {
    return undefined;
  }

  const parsedViewCount = Number(viewCount);

  if (!Number.isFinite(parsedViewCount) || parsedViewCount < 0) {
    return undefined;
  }

  return formatCompactCount(parsedViewCount);
}

function App() {
  const { accessToken, isLoggingOut, logout, status: authStatus, user } = useAuth();
  const [selectedRegionCode, setSelectedRegionCode] = useState(getInitialRegionCode);
  const [selectedCategoryId, setSelectedCategoryId] = useState(DEFAULT_CATEGORY_ID);
  const [selectedVideoId, setSelectedVideoId] = useState<string>();
  const [isCinematicMode, setIsCinematicMode] = useState(getInitialCinematicMode);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(getInitialIsMobileLayout);
  const playerStageRef = useRef<HTMLDivElement | null>(null);
  const playerSectionRef = useRef<HTMLElement | null>(null);
  const playerViewportRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToPlayerRef = useRef(false);
  const shouldScrollOnModeChangeRef = useRef(false);
  const {
    data: videoCategories = [],
    isLoading: isVideoCategoriesLoading,
    isError: isVideoCategoriesError,
    error: videoCategoriesError,
  } = useVideoCategories(selectedRegionCode);
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
  const selectedSectionVideoIds = selectedSection?.items.map((item) => item.id) ?? [];
  const selectedCountryName =
    countryCodes.find((country) => country.code === selectedRegionCode)?.name ?? selectedRegionCode;
  const isDesktopCinematicMode = !isMobileLayout && isCinematicMode;
  const isDarkMode = themeMode === 'dark';
  const shouldLoadFavorites = isApiConfigured && authStatus === 'authenticated';
  const cinematicToggleLabel = isDesktopCinematicMode ? '기본 보기' : '시네마틱 모드';
  const themeToggleLabel = isDarkMode ? '라이트 모드' : '다크 모드';
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
  const realtimeSurgingSection =
    isAllCategorySelected && realtimeSurgingData
      ? {
          categoryId: realtimeSurgingData.categoryId,
          label: '실시간 급상승',
          description: `전체 차트에서 직전 집계 대비 순위가 ${realtimeSurgingData.rankChangeThreshold}계단 이상 오른 영상을 모았습니다.`,
          items: realtimeSurgingData.items.map(mapTrendSignalToVideoItem),
        }
      : undefined;
  const realtimeSurgingEmptyMessage =
    isAllCategorySelected && !isChartLoading && !isRealtimeSurgingLoading && !isRealtimeSurgingError
      ? `아직 +${realtimeSurgingData?.rankChangeThreshold ?? 5} 이상 급상승한 영상이 없습니다.`
      : undefined;
  const featuredItems = realtimeSurgingSection?.items ?? [];
  const combinedPlayableItems = mergeUniqueVideoItems(
    featuredItems,
    selectedSection?.items,
    favoriteStreamerVideoSection?.items,
  );
  const selectedVideo = combinedPlayableItems.find((item) => item.id === selectedVideoId);
  const selectedVideoViewCount = formatVideoViewCount(selectedVideo?.statistics?.viewCount);
  const selectedVideoStatLabel = selectedVideoViewCount;
  const canPlayNextVideo = combinedPlayableItems.length > 1;
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

  useEffect(() => {
    if (!(favoriteStreamersError instanceof ApiRequestError)) {
      return;
    }

    if (
      favoriteStreamersError.code !== 'unauthorized' &&
      favoriteStreamersError.code !== 'session_expired'
    ) {
      return;
    }

    void logout();
  }, [favoriteStreamersError, logout]);

  useEffect(() => {
    if (!(favoriteStreamerVideosError instanceof ApiRequestError)) {
      return;
    }

    if (
      favoriteStreamerVideosError.code !== 'unauthorized' &&
      favoriteStreamerVideosError.code !== 'session_expired'
    ) {
      return;
    }

    void logout();
  }, [favoriteStreamerVideosError, logout]);

  function handleSelectVideo(videoId: string, triggerElement?: HTMLButtonElement) {
    shouldScrollToPlayerRef.current = true;
    setSelectedVideoId(videoId);
    triggerElement?.blur();
  }

  function handleSelectCategory(categoryId: string, triggerElement?: HTMLButtonElement) {
    if (!categoryId) {
      triggerElement?.blur();
      return;
    }

    if (categoryId === selectedCategoryId) {
      const firstVideoId = selectedSection?.items[0]?.id;

      if (firstVideoId) {
        shouldScrollToPlayerRef.current = true;
        setSelectedVideoId(firstVideoId);
      }

      triggerElement?.blur();
      return;
    }

    shouldScrollToPlayerRef.current = true;
    setSelectedCategoryId(categoryId);
    setSelectedVideoId(undefined);
    triggerElement?.blur();
  }

  function handleSelectRegion(regionCode: RegionCode) {
    setSelectedRegionCode(regionCode);
    setSelectedVideoId(undefined);
  }

  function handleSelectAdjacentVideo(step: number) {
    if (combinedPlayableItems.length === 0) {
      return;
    }

    if (isMobileLayout) {
      shouldScrollToPlayerRef.current = true;
    }

    const chartItems = selectedSection?.items ?? [];
    const activeItems =
      chartItems.length > 0 && chartItems.some((item) => item.id === selectedVideoId)
        ? chartItems
        : combinedPlayableItems;
    const currentIndex = activeItems.findIndex((item) => item.id === selectedVideoId);
    const fallbackItems = chartItems.length > 0 ? chartItems : combinedPlayableItems;
    const nextItems = currentIndex >= 0 ? activeItems : fallbackItems;
    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + step + activeItems.length) % activeItems.length
        : step >= 0
          ? 0
          : nextItems.length - 1;

    setSelectedVideoId(nextItems[nextIndex]?.id);
  }

  function handlePlayNextVideo() {
    handleSelectAdjacentVideo(1);
  }

  function handlePlayPreviousVideo() {
    handleSelectAdjacentVideo(-1);
  }

  function handleVideoEnd() {
    handlePlayNextVideo();
  }

  useEffect(() => {
    const firstVideoId = selectedSection?.items[0]?.id ?? favoriteStreamerVideoSection?.items[0]?.id;

    if (!firstVideoId) {
      setSelectedVideoId(undefined);
      return;
    }

    const hasSelectedVideo = combinedPlayableItems.some((item) => item.id === selectedVideoId);

    if (!hasSelectedVideo) {
      setSelectedVideoId(firstVideoId);
    }
  }, [combinedPlayableItems, favoriteStreamerVideoSection, selectedSection, selectedVideoId]);

  useEffect(() => {
    if (!sortedVideoCategories.length) {
      return;
    }

    const hasSelectedCategory = sortedVideoCategories.some((category) => category.id === selectedCategoryId);

    if (!hasSelectedCategory) {
      setSelectedCategoryId(sortedVideoCategories[0].id);
      setSelectedVideoId(undefined);
    }
  }, [selectedCategoryId, sortedVideoCategories]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobileLayout(event.matches);
    };

    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener: (listener: (event: MediaQueryListEvent) => void) => void;
    };

    legacyMediaQuery.addListener(handleChange);

    return () => {
      legacyMediaQuery.removeListener(handleChange);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, selectedRegionCode);
  }, [selectedRegionCode]);

  useEffect(() => {
    window.localStorage.setItem(CINEMATIC_MODE_STORAGE_KEY, String(isCinematicMode));
  }, [isCinematicMode]);

  useEffect(() => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    if (isMobileLayout) {
      return;
    }

    const handleFullscreenChange = () => {
      if (getFullscreenElement() !== playerStageRef.current) {
        setIsCinematicMode(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    };
  }, [isMobileLayout]);

  useEffect(() => {
    if (!isFilterModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterModalOpen(false);
      }
    };

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousDocumentOverflow = documentElement.style.overflow;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      documentElement.style.overflow = previousDocumentOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFilterModalOpen]);

  useEffect(() => {
    if (!isDesktopCinematicMode || !shouldScrollOnModeChangeRef.current) {
      return;
    }

    shouldScrollOnModeChangeRef.current = false;

    window.setTimeout(() => {
      const playerSection = playerSectionRef.current;

      if (!playerSection) {
        return;
      }

      playerSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }, [isDesktopCinematicMode]);

  useEffect(() => {
    if (!selectedVideoId || !shouldScrollToPlayerRef.current) {
      return;
    }

    shouldScrollToPlayerRef.current = false;

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
  }, [isMobileLayout, selectedVideoId]);

  async function handleToggleCinematicMode() {
    if (isMobileLayout) {
      return;
    }

    if (isDesktopCinematicMode) {
      try {
        await exitElementFullscreen();
      } catch {
        setIsCinematicMode(false);
      }

      return;
    }

    shouldScrollOnModeChangeRef.current = true;
    setIsCinematicMode(true);

    window.setTimeout(() => {
      const playerStage = playerStageRef.current;

      if (!playerStage) {
        setIsCinematicMode(false);
        return;
      }

      void requestElementFullscreen(playerStage).catch(() => {
        setIsCinematicMode(false);
      });
    }, 0);
  }

  function openFilterModal() {
    setIsFilterModalOpen(true);
  }

  function closeFilterModal() {
    setIsFilterModalOpen(false);
  }

  function handleToggleThemeMode() {
    setThemeMode((currentThemeMode) => (currentThemeMode === 'dark' ? 'light' : 'dark'));
  }

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

  function handleCompleteFilterSelection() {
    setIsFilterModalOpen(false);
  }

  const filterSummaryContent = (
    <section className="app-shell__panel app-shell__panel--filters">
      <div className="app-shell__section-heading app-shell__section-heading--filters">
        <div className="app-shell__section-heading-copy">
          <p className="app-shell__section-eyebrow">Filters</p>
          <h2 className="app-shell__section-title">필터</h2>
        </div>
        <button className="app-shell__filter-trigger" onClick={openFilterModal} type="button">
          변경
        </button>
      </div>
      <div className="app-shell__filter-summary" aria-label="현재 필터">
        <div className="app-shell__filter-pill-group">
          <span className="app-shell__filter-pill">
            <strong>국가</strong>
            <span>{selectedCountryName}</span>
          </span>
          <span className="app-shell__filter-pill">
            <strong>카테고리</strong>
            <span>{selectedCategory?.label ?? '선택 중'}</span>
          </span>
        </div>
        <p className="app-shell__filter-summary-text">빠른 카테고리</p>
        <div className="app-shell__quick-category-group" aria-label="메인 카테고리 빠른 선택">
          {mainVideoCategories.map((category) => (
            <button
              key={category.id}
              className="app-shell__quick-category"
              data-active={category.id === selectedCategoryId}
              onClick={(event) => handleSelectCategory(category.id, event.currentTarget)}
              type="button"
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );

  const cinematicQuickFiltersContent = isDesktopCinematicMode ? (
    <section className="app-shell__cinematic-filters" aria-label="시네마틱 메인 필터">
      <div className="app-shell__section-heading">
        <div className="app-shell__section-heading-copy">
          <p className="app-shell__section-eyebrow">Main Filters</p>
          <h2 className="app-shell__section-title">메인 카테고리 빠른 전환</h2>
        </div>
      </div>
      <div className="app-shell__quick-category-group" aria-label="시네마틱 메인 카테고리 빠른 선택">
        {mainVideoCategories.map((category) => (
          <button
            key={category.id}
            className="app-shell__quick-category"
            data-active={category.id === selectedCategoryId}
            onClick={(event) => handleSelectCategory(category.id, event.currentTarget)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>
    </section>
  ) : null;

  const filterModalContent = isFilterModalOpen ? (
    <div className="app-shell__modal-backdrop" onClick={closeFilterModal} role="presentation">
      <section
        aria-labelledby="filter-modal-title"
        aria-modal="true"
        className="app-shell__modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="app-shell__modal-header">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Filters</p>
            <h2 className="app-shell__section-title" id="filter-modal-title">
              필터
            </h2>
          </div>
          <button
            aria-label="필터 모달 닫기"
            className="app-shell__modal-close"
            onClick={closeFilterModal}
            type="button"
          >
            닫기
          </button>
        </div>

        <div className="app-shell__modal-body">
          <div className="app-shell__filter-pill-group">
            <span className="app-shell__filter-pill">
              <strong>현재 국가</strong>
              <span>{selectedCountryName}</span>
            </span>
            <span className="app-shell__filter-pill">
              <strong>현재 카테고리</strong>
              <span>{selectedCategory?.label ?? '선택 중'}</span>
            </span>
          </div>

          <div className="app-shell__modal-fields">
            <div className="app-shell__modal-field">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Region</p>
                <h3 className="app-shell__modal-field-title">국가</h3>
              </div>
              <SearchBar
                ariaLabel="국가 선택"
                onChange={(regionCode) => handleSelectRegion(regionCode as RegionCode)}
                options={regionOptions}
                value={selectedRegionCode}
              />
            </div>

            <div className="app-shell__modal-field">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Main Categories</p>
                <h3 className="app-shell__modal-field-title">빠른 카테고리</h3>
              </div>
              <div className="app-shell__quick-category-group" aria-label="메인 카테고리 목록">
                {mainVideoCategories.map((category) => (
                  <button
                    key={category.id}
                    className="app-shell__quick-category"
                    data-active={category.id === selectedCategoryId}
                    onClick={(event) => handleSelectCategory(category.id, event.currentTarget)}
                    type="button"
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="app-shell__modal-field">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Detail Categories</p>
                <h3 className="app-shell__modal-field-title">전체 카테고리</h3>
              </div>
              <SearchBar
                ariaLabel="세부 카테고리 선택"
                disabled={isVideoCategoriesLoading || isVideoCategoriesError || detailCategoryOptions.length === 0}
                emptyLabel={
                  isVideoCategoriesLoading
                    ? '세부 카테고리를 불러오는 중입니다.'
                    : isVideoCategoriesError
                      ? '세부 카테고리를 불러오지 못했습니다.'
                      : '선택 가능한 세부 카테고리가 없습니다.'
                }
                helperText={detailCategoryHelperText}
                onChange={handleSelectCategory}
                options={detailCategoryOptions}
                placeholderLabel="카테고리 선택"
                value={selectedCategory?.id ?? ''}
              />
            </div>
          </div>
        </div>

        <div className="app-shell__modal-footer">
          <button className="app-shell__modal-action" onClick={handleCompleteFilterSelection} type="button">
            적용
          </button>
        </div>
      </section>
    </div>
  ) : null;

  function renderChartPanel(className?: string) {
    return (
      <section className={className ? `app-shell__panel app-shell__panel--chart ${className}` : 'app-shell__panel app-shell__panel--chart'}>
        <div className="app-shell__section-heading">
          <p className="app-shell__section-eyebrow">Program Queue</p>
          <h2 className="app-shell__section-title">
            {selectedCategory?.label ?? '선택한 카테고리'} 인기 영상
          </h2>
        </div>
        <VideoList
          errorMessage={chartErrorMessage}
          featuredSection={realtimeSurgingSection}
          featuredSectionEmptyMessage={realtimeSurgingEmptyMessage}
          featuredSectionEyebrow="Realtime Movers"
          getFeaturedRankLabel={(item) => {
            const signal = realtimeSurgingSignalsByVideoId[item.id];
            if (!signal?.rankChange) {
              return '실시간 급상승';
            }

            return `전체 ${signal.currentRank}위 · ${signal.rankChange > 0 ? '+' : ''}${signal.rankChange}`;
          }}
          hasNextPage={hasNextPage}
          hasResolvedTrendSignals={isApiConfigured && !isTrendSignalsLoading && !isTrendSignalsError}
          isError={isChartError}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isChartLoading}
          onLoadMore={() => void fetchNextPage()}
          section={selectedSection}
          onSelectVideo={handleSelectVideo}
          selectedVideoId={selectedVideoId}
          trendSignalsByVideoId={combinedTrendSignalsByVideoId}
        />
      </section>
    );
  }

  const favoriteStreamerVideoErrorMessage =
    favoriteStreamerVideosError instanceof Error
      ? favoriteStreamerVideosError.message
      : '즐겨찾기 영상을 불러오지 못했습니다.';

  const favoriteVideosContent = (
    <section className="app-shell__panel app-shell__panel--chart">
      <div className="app-shell__section-heading">
        <p className="app-shell__section-eyebrow">Favorite Videos</p>
        <h2 className="app-shell__section-title">{selectedCountryName} 기준 즐겨찾기 영상</h2>
      </div>
      {authStatus !== 'authenticated' ? (
        <p className="app-shell__favorites-status">
          로그인하면 저장한 채널의 인기 영상을 여기에서 모아 볼 수 있습니다.
        </p>
      ) : isFavoriteStreamersLoading ? (
        <p className="app-shell__favorites-status">
          즐겨찾기 채널을 확인한 뒤 영상 목록을 준비하고 있습니다.
        </p>
      ) : isFavoriteStreamersError ? (
        <p className="app-shell__favorites-status">
          즐겨찾기 채널을 불러오지 못해 영상 목록을 준비하지 못했습니다.
        </p>
      ) : favoriteStreamers.length === 0 ? (
        <p className="app-shell__favorites-status">
          저장한 채널이 생기면 해당 채널의 인기 영상을 여기에서 바로 볼 수 있습니다.
        </p>
      ) : (
        <VideoList
          errorMessage={favoriteStreamerVideoErrorMessage}
          getRankLabel={(item) => {
            const signal = favoriteTrendSignalsByVideoId[item.id];

            if (signal?.currentRank) {
              return `현재 ${signal.currentRank}위`;
            }

            return isFavoriteTrendSignalsLoading ? '현재 순위 확인 중' : '현재 순위 미집계';
          }}
          hasNextPage={hasNextFavoriteStreamerVideosPage}
          hasResolvedTrendSignals={
            isApiConfigured && !isFavoriteTrendSignalsLoading && !isFavoriteTrendSignalsError
          }
          isError={isFavoriteStreamerVideosError}
          isFetchingNextPage={isFetchingNextFavoriteStreamerVideosPage}
          isLoading={isFavoriteStreamerVideosLoading}
          onLoadMore={() => void fetchNextFavoriteStreamerVideosPage()}
          onSelectVideo={handleSelectVideo}
          section={favoriteStreamerVideoSection}
          selectedVideoId={selectedVideoId}
          trendSignalsByVideoId={combinedTrendSignalsByVideoId}
        />
      )}
    </section>
  );

  function renderCommunityContent() {
    return (
      <section className="app-shell__panel app-shell__panel--community">
        <div className="app-shell__section-heading">
          <p className="app-shell__section-eyebrow">Live Chat</p>
          <h2 className="app-shell__section-title">실시간 채팅</h2>
        </div>
        <CommentSection
          videoId={selectedVideoId}
          videoTitle={selectedVideo?.snippet.title}
        />
      </section>
    );
  }

  const playerContent = (
    <div ref={playerStageRef} className="app-shell__stage" data-cinematic={isDesktopCinematicMode}>
      <div className="app-shell__stage-stack" data-cinematic={isDesktopCinematicMode}>
        <section
          ref={playerSectionRef}
          className="app-shell__panel app-shell__panel--player"
          data-cinematic={isDesktopCinematicMode}
        >
          <div className="app-shell__section-heading app-shell__section-heading--player">
            <div className="app-shell__section-heading-copy">
              <p className="app-shell__section-eyebrow">Now Playing</p>
              <h2 className="app-shell__section-title">
                {selectedCountryName}
                {selectedCategory ? ` · ${selectedCategory.label}` : ''}
              </h2>
            </div>
            <div className="app-shell__player-actions">
              {!isMobileLayout ? (
                <button
                  aria-label={cinematicToggleLabel}
                  className="app-shell__mode-toggle"
                  data-active={isDesktopCinematicMode}
                  onClick={() => void handleToggleCinematicMode()}
                  title={cinematicToggleLabel}
                  type="button"
                >
                  {cinematicToggleLabel}
                </button>
              ) : null}
            </div>
          </div>
          <div ref={playerViewportRef} className="app-shell__player-viewport">
            <VideoPlayer
              isLoading={isChartLoading}
              isCinematic={isDesktopCinematicMode}
              showOverlayNavigation={!isMobileLayout}
              onPreviousVideo={handlePlayPreviousVideo}
              onNextVideo={handlePlayNextVideo}
              selectedVideoId={selectedVideoId}
              onVideoEnd={handleVideoEnd}
              canNavigateVideos={canPlayNextVideo}
            />
          </div>
          {selectedVideo ? (
            <div className="app-shell__stage-meta">
              <div className="app-shell__stage-copy">
                <div className="app-shell__stage-headline">
                  <h3 className="app-shell__stage-title">{selectedVideo.snippet.title}</h3>
                  {selectedVideoStatLabel ? (
                    <span className="app-shell__stage-stat">{selectedVideoStatLabel}</span>
                  ) : null}
                </div>
                <p className="app-shell__stage-channel">{selectedVideo.snippet.channelTitle}</p>
                <p className="app-shell__stage-helper">{favoriteToggleHelperText}</p>
              </div>
              <div className="app-shell__stage-side">
                <button
                  aria-label={favoriteToggleLabel}
                  className="app-shell__favorite-toggle"
                  data-active={isSelectedChannelFavorited}
                  disabled={
                    authStatus !== 'authenticated' ||
                    !selectedChannelId ||
                    toggleFavoriteStreamerMutation.isPending
                  }
                  onClick={() => void handleToggleFavoriteStreamer()}
                  title={favoriteToggleLabel}
                  type="button"
                >
                  <span className="app-shell__favorite-toggle-icon" aria-hidden="true">
                    {toggleFavoriteStreamerMutation.isPending
                      ? '⋯'
                      : isSelectedChannelFavorited
                        ? '★'
                        : '☆'}
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </section>
        {cinematicQuickFiltersContent}
        {isDesktopCinematicMode ? renderChartPanel('app-shell__panel--chart-cinematic') : null}
      </div>
    </div>
  );

  const communityContent = renderCommunityContent();

  const chartContent = renderChartPanel();
  const userIdentityLabel = user?.displayName || user?.email || 'Google 계정';
  const themeToggleDisplayLabel = isDarkMode ? '☀' : '☾';

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-top">
          <h1 className="app-shell__title">YouTube Atlas</h1>
          <div className="app-shell__header-actions">
            <button
              aria-label={themeToggleLabel}
              aria-pressed={isDarkMode}
              className="app-shell__theme-toggle"
              data-active={isDarkMode}
              onClick={handleToggleThemeMode}
              type="button"
            >
              {themeToggleDisplayLabel}
            </button>
            {authStatus === 'authenticated' && user ? (
              <div className="app-shell__auth-session">
                {user.pictureUrl ? (
                  <img
                    alt={`${userIdentityLabel} 프로필`}
                    className="app-shell__auth-avatar"
                    src={user.pictureUrl}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="app-shell__auth-avatar app-shell__auth-avatar--fallback"
                  >
                    {userIdentityLabel.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <button
                  className="app-shell__auth-logout"
                  onClick={() => void logout()}
                  title={userIdentityLabel}
                  type="button"
                >
                  {isLoggingOut ? '...' : '로그아웃'}
                </button>
              </div>
            ) : (
              <div className="app-shell__auth-panel">
                <GoogleLoginButton />
              </div>
            )}
          </div>
        </div>
      </header>
        <main className="app-shell__main">
          {isMobileLayout ? (
          <>
            {playerContent}
            {filterSummaryContent}
            {favoriteVideosContent}
            {chartContent}
            {communityContent}
          </>
        ) : (
          <>
            {playerContent}
            {!isDesktopCinematicMode ? filterSummaryContent : null}
            {!isDesktopCinematicMode ? favoriteVideosContent : null}
            {!isDesktopCinematicMode ? chartContent : null}
            {communityContent}
          </>
        )}
      </main>
      {filterModalContent}
    </div>
  );
}

export default App;
