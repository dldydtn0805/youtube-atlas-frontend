import { useEffect, useRef, useState } from 'react';
import CommentSection from '../components/CommentSection/CommentSection';
import SearchBar from '../components/SearchBar/SearchBar';
import VideoList from '../components/VideoList/VideoList';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import countryCodes from '../constants/countryCodes';
import { YouTubeCategorySection } from '../features/youtube/types';
import { usePopularVideosByCategory, useVideoCategories } from '../features/youtube/queries';
import { isSupabaseConfigured } from '../lib/supabase';
import '../styles/app.css';

const DEFAULT_REGION_CODE = 'US';
const DEFAULT_CATEGORY_ID = '0';
const MOBILE_BREAKPOINT = 768;
const STORAGE_KEY = 'youtube-atlas-region-code';
const CINEMATIC_MODE_STORAGE_KEY = 'youtube-atlas-cinematic-mode';
type RegionCode = (typeof countryCodes)[number]['code'];
type MobileTab = 'browse' | 'chart' | 'chat';

const SUPPORTED_REGION_CODES = new Set<string>(countryCodes.map((country) => country.code));

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

function getInitialIsMobileLayout() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth <= MOBILE_BREAKPOINT;
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

function App() {
  const [selectedRegionCode, setSelectedRegionCode] = useState(getInitialRegionCode);
  const [selectedCategoryId, setSelectedCategoryId] = useState(DEFAULT_CATEGORY_ID);
  const [selectedVideoId, setSelectedVideoId] = useState<string>();
  const [isCinematicMode, setIsCinematicMode] = useState(getInitialCinematicMode);
  const [isMobileLayout, setIsMobileLayout] = useState(getInitialIsMobileLayout);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chart');
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
  const selectedCategory =
    videoCategories.find((category) => category.id === selectedCategoryId) ?? videoCategories[0];
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
  const selectedVideo = selectedSection?.items.find((item) => item.id === selectedVideoId);
  const selectedCountryName =
    countryCodes.find((country) => country.code === selectedRegionCode)?.name ?? selectedRegionCode;
  const isDesktopCinematicMode = !isMobileLayout && isCinematicMode;
  const canPlayNextVideo = (selectedSection?.items.length ?? 0) > 1;
  const cinematicToggleLabel = isDesktopCinematicMode ? '기본 보기' : '시네마틱 모드';
  const queueSize = selectedSection?.items.length ?? 0;
  const selectedVideoOrder = selectedSection?.items.findIndex((item) => item.id === selectedVideoId) ?? -1;
  const selectedVideoSlot = selectedVideoOrder >= 0 ? String(selectedVideoOrder + 1).padStart(2, '0') : '--';
  const broadcastModeLabel = isDesktopCinematicMode ? 'FOCUS MODE' : 'CONTROL DECK';
  const liveStatusLabel = isSupabaseConfigured ? 'REALTIME LINK' : 'CHAT OFFLINE';
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
  const categoryHint = isVideoCategoriesLoading
    ? '카테고리를 불러오는 중입니다.'
    : isVideoCategoriesError
      ? chartErrorMessage
      : selectedCategory?.description ?? '선택 가능한 카테고리를 찾고 있습니다.';
  const selectedCategoryValue = selectedCategory?.id ?? (isVideoCategoriesLoading ? selectedCategoryId : '');

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
    if (isMobileLayout) {
      setMobileTab('chart');
    }
    triggerElement?.blur();
  }

  function handleSelectRegion(regionCode: RegionCode) {
    setSelectedRegionCode(regionCode);
    setSelectedVideoId(undefined);

    if (isMobileLayout) {
      setMobileTab('chart');
    }
  }

  function handleSelectAdjacentVideo(step: number) {
    if (!selectedSection || selectedSection.items.length === 0) {
      return;
    }

    if (isMobileLayout) {
      shouldScrollToPlayerRef.current = true;
    }

    const currentIndex = selectedSection.items.findIndex((item) => item.id === selectedVideoId);
    const fallbackIndex = step >= 0 ? 0 : selectedSection.items.length - 1;
    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + step + selectedSection.items.length) % selectedSection.items.length
        : fallbackIndex;

    setSelectedVideoId(selectedSection.items[nextIndex]?.id);
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
    const firstVideoId = selectedSection?.items[0]?.id;

    if (!firstVideoId) {
      setSelectedVideoId(undefined);
      return;
    }

    const hasSelectedVideo = selectedSection.items.some((item) => item.id === selectedVideoId);

    if (!hasSelectedVideo) {
      setSelectedVideoId(firstVideoId);
    }
  }, [selectedSection, selectedVideoId]);

  useEffect(() => {
    if (!videoCategories.length) {
      return;
    }

    const hasSelectedCategory = videoCategories.some((category) => category.id === selectedCategoryId);

    if (!hasSelectedCategory) {
      setSelectedCategoryId(videoCategories[0].id);
      setSelectedVideoId(undefined);
    }
  }, [selectedCategoryId, videoCategories]);

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

  function handleToggleCinematicMode() {
    if (isMobileLayout) {
      return;
    }

    shouldScrollOnModeChangeRef.current = !isDesktopCinematicMode;
    setIsCinematicMode((current) => !current);
  }

  const filterDeckContent = (
    <section className="app-shell__panel app-shell__panel--filters app-shell__panel--filter-deck">
      <div className="app-shell__section-heading">
        <p className="app-shell__section-eyebrow">Signal Routing</p>
        <h2 className="app-shell__section-title">국가와 카테고리 라우팅</h2>
      </div>
      <div className="filter-deck" aria-label="영상 라우팅 선택">
        <div className="filter-deck__field">
          <div className="filter-deck__meta">
            <span className="filter-deck__label">Region</span>
            <strong className="filter-deck__value">{selectedCountryName}</strong>
          </div>
          <SearchBar
            selectedRegionCode={selectedRegionCode}
            onSelectRegion={handleSelectRegion}
          />
        </div>
        <label className="filter-deck__field filter-deck__field--select">
          <div className="filter-deck__meta">
            <span className="filter-deck__label">Channel</span>
            <strong className="filter-deck__value">{selectedCategory?.label ?? '선택'}</strong>
          </div>
          <div className="filter-deck__select-wrap">
            <select
              aria-label="영상 카테고리 선택"
              className="filter-deck__select"
              disabled={isVideoCategoriesLoading || isVideoCategoriesError || videoCategories.length === 0}
              onChange={(event) => handleSelectCategory(event.target.value)}
              value={selectedCategoryValue}
            >
              {isVideoCategoriesLoading ? (
                <option value={selectedCategoryValue}>카테고리 불러오는 중...</option>
              ) : null}
              {!isVideoCategoriesLoading && videoCategories.length === 0 ? (
                <option value="">표시할 카테고리가 없습니다.</option>
              ) : null}
              {videoCategories.map((category, index) => (
                <option key={category.id} value={category.id}>
                  {`CH ${String(index + 1).padStart(2, '0')} · ${category.label}`}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="filter-deck__chevron">
              ▾
            </span>
          </div>
          <span className="filter-deck__hint">{categoryHint}</span>
        </label>
      </div>
    </section>
  );

  const filtersContent = (
    <div className="app-shell__mobile-stack">{filterDeckContent}</div>
  );

  const playerContent = (
    <div className="app-shell__stage" data-cinematic={isDesktopCinematicMode}>
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
                onClick={handleToggleCinematicMode}
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
            showOverlayNavigation
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
              <h3 className="app-shell__stage-title">{selectedVideo.snippet.title}</h3>
              <p className="app-shell__stage-channel">{selectedVideo.snippet.channelTitle}</p>
            </div>
            <div className="app-shell__stage-side">
              <div className="app-shell__stage-readouts" aria-label="재생 현황">
                <div className="app-shell__stage-readout">
                  <span className="app-shell__stage-readout-label">QUEUE</span>
                  <strong className="app-shell__stage-readout-value">{String(queueSize).padStart(2, '0')}</strong>
                </div>
                <div className="app-shell__stage-readout">
                  <span className="app-shell__stage-readout-label">SLOT</span>
                  <strong className="app-shell__stage-readout-value">{selectedVideoSlot}</strong>
                </div>
              </div>
              <div className="app-shell__stage-tags" aria-label="현재 재생 정보">
                <span className="app-shell__stage-tag">{selectedCountryName}</span>
                {selectedCategory ? (
                  <span className="app-shell__stage-tag">{selectedCategory.label}</span>
                ) : null}
                <span className="app-shell__stage-tag">{broadcastModeLabel}</span>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );

  const communityContent = (
    <section className="app-shell__panel app-shell__panel--community">
      <div className="app-shell__section-heading">
        <p className="app-shell__section-eyebrow">Live Room</p>
        <h2 className="app-shell__section-title">실시간 관제 채팅</h2>
      </div>
      <CommentSection
        videoId={selectedVideoId}
        videoTitle={selectedVideo?.snippet.title}
      />
    </section>
  );

  const chartContent = (
    <section className="app-shell__panel app-shell__panel--chart">
      <div className="app-shell__section-heading">
        <p className="app-shell__section-eyebrow">Program Queue</p>
        <h2 className="app-shell__section-title">
          {selectedCategory?.label ?? '선택한 카테고리'} 인기 영상
        </h2>
      </div>
      <VideoList
        errorMessage={chartErrorMessage}
        hasNextPage={hasNextPage}
        isError={isChartError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isChartLoading}
        onLoadMore={() => void fetchNextPage()}
        section={selectedSection}
        onSelectVideo={handleSelectVideo}
        selectedVideoId={selectedVideoId}
      />
    </section>
  );

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__hero-panel">
          <div className="app-shell__hero-copy">
            <p className="app-shell__eyebrow">Broadcast Control Room / Global Trending Feed</p>
            <h1 className="app-shell__title">YOUTUBE ATLAS</h1>
            <p className="app-shell__subtitle">
              {selectedCountryName} 트렌딩 피드를 관제실 화면처럼 탐색하고, 바로 재생하고, 같은
              영상을 보는 사람들과 실시간으로 대화할 수 있는 브로드캐스트 데크입니다.
            </p>
          </div>
          <div className="app-shell__hero-readouts" aria-label="현재 방송 상태">
            <article className="app-shell__hero-readout">
              <span className="app-shell__hero-readout-label">REGION</span>
              <strong className="app-shell__hero-readout-value">{selectedCountryName}</strong>
              <span className="app-shell__hero-readout-meta">{selectedRegionCode}</span>
            </article>
            <article className="app-shell__hero-readout">
              <span className="app-shell__hero-readout-label">CHANNEL</span>
              <strong className="app-shell__hero-readout-value">
                {selectedCategory?.label ?? 'UNSET'}
              </strong>
              <span className="app-shell__hero-readout-meta">QUEUE {String(queueSize).padStart(2, '0')}</span>
            </article>
            <article className="app-shell__hero-readout">
              <span className="app-shell__hero-readout-label">STATUS</span>
              <strong className="app-shell__hero-readout-value">{liveStatusLabel}</strong>
              <span className="app-shell__hero-readout-meta">SUPABASE</span>
            </article>
            <article className="app-shell__hero-readout">
              <span className="app-shell__hero-readout-label">MODE</span>
              <strong className="app-shell__hero-readout-value">{broadcastModeLabel}</strong>
              <span className="app-shell__hero-readout-meta">
                {selectedVideo ? `SLOT ${selectedVideoSlot}` : 'NO SIGNAL'}
              </span>
            </article>
          </div>
        </div>
      </header>
      <main className="app-shell__main">
        {isMobileLayout ? (
          <>
            {playerContent}
            <nav className="app-shell__mobile-tabs" aria-label="모바일 화면 전환">
              <button
                className="app-shell__mobile-tab"
                data-active={mobileTab === 'chart'}
                onClick={() => setMobileTab('chart')}
                type="button"
              >
                차트
              </button>
              <button
                className="app-shell__mobile-tab"
                data-active={mobileTab === 'browse'}
                onClick={() => setMobileTab('browse')}
                type="button"
              >
                필터
              </button>
              <button
                className="app-shell__mobile-tab"
                data-active={mobileTab === 'chat'}
                onClick={() => setMobileTab('chat')}
                type="button"
              >
                채팅
              </button>
            </nav>
            {mobileTab === 'chart' ? chartContent : null}
            {mobileTab === 'browse' ? filtersContent : null}
            {mobileTab === 'chat' ? communityContent : null}
          </>
        ) : (
          <>
            {filterDeckContent}

            {playerContent}

            <div className="app-shell__content-grid">
              {chartContent}
              {communityContent}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
