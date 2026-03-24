import { useEffect, useRef, useState } from 'react';
import CommentSection from '../components/CommentSection/CommentSection';
import SearchBar from '../components/SearchBar/SearchBar';
import VideoList from '../components/VideoList/VideoList';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import countryCodes from '../constants/countryCodes';
import { useVideoTrendSignals } from '../features/trending/queries';
import { YouTubeCategorySection } from '../features/youtube/types';
import { usePopularVideosByCategory, useVideoCategories } from '../features/youtube/queries';
import { isApiConfigured } from '../lib/api';
import '../styles/app.css';

const DEFAULT_REGION_CODE = 'US';
const DEFAULT_CATEGORY_ID = '0';
const MOBILE_BREAKPOINT = 768;
const STORAGE_KEY = 'youtube-atlas-region-code';
const CINEMATIC_MODE_STORAGE_KEY = 'youtube-atlas-cinematic-mode';
type RegionCode = (typeof countryCodes)[number]['code'];
type MobileTab = 'chart' | 'chat';

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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
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
  const sortedVideoCategories = [...videoCategories].sort((left, right) =>
    left.id === DEFAULT_CATEGORY_ID
      ? -1
      : right.id === DEFAULT_CATEGORY_ID
        ? 1
        : left.label.localeCompare(right.label, 'ko'),
  );
  const regionOptions = sortedCountryCodes.map((country) => ({
    value: country.code,
    label: `${country.code} · ${country.name}`,
  }));
  const categoryOptions = sortedVideoCategories.map((category) => ({
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
  const selectedVideo = selectedSection?.items.find((item) => item.id === selectedVideoId);
  const selectedSectionVideoIds = selectedSection?.items.map((item) => item.id) ?? [];
  const selectedCountryName =
    countryCodes.find((country) => country.code === selectedRegionCode)?.name ?? selectedRegionCode;
  const isDesktopCinematicMode = !isMobileLayout && isCinematicMode;
  const canPlayNextVideo = (selectedSection?.items.length ?? 0) > 1;
  const cinematicToggleLabel = isDesktopCinematicMode ? '기본 보기' : '시네마틱 모드';
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
  const categoryFilterHelperText = isVideoCategoriesLoading
    ? '카테고리를 불러오는 중입니다.'
    : isVideoCategoriesError
      ? `불러오기에 실패했습니다. ${chartErrorMessage}`
      : selectedCategory?.description ?? '표시할 카테고리가 없습니다.';
  const { data: trendSignalsByVideoId = {} } = useVideoTrendSignals(
    selectedRegionCode,
    selectedCategory?.id,
    selectedSectionVideoIds,
    isApiConfigured,
  );

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
    if (!isFilterModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterModalOpen(false);
      }
    };

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
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

  function handleToggleCinematicMode() {
    if (isMobileLayout) {
      return;
    }

    shouldScrollOnModeChangeRef.current = !isDesktopCinematicMode;
    setIsCinematicMode((current) => !current);
  }

  function openFilterModal() {
    setIsFilterModalOpen(true);
  }

  function closeFilterModal() {
    setIsFilterModalOpen(false);
  }

  function handleCompleteFilterSelection() {
    setIsFilterModalOpen(false);

    if (isMobileLayout) {
      setMobileTab('chart');
    }
  }

  const filterSummaryContent = (
    <section className="app-shell__panel app-shell__panel--filters">
      <div className="app-shell__section-heading app-shell__section-heading--filters">
        <div className="app-shell__section-heading-copy">
          <p className="app-shell__section-eyebrow">Filters</p>
          <h2 className="app-shell__section-title">국가와 카테고리 선택</h2>
        </div>
        <button className="app-shell__filter-trigger" onClick={openFilterModal} type="button">
          필터 열기
        </button>
      </div>
      <div className="app-shell__filter-summary" aria-label="현재 필터">
        <div className="app-shell__filter-pill-group">
          <span className="app-shell__filter-pill">
            <strong>국가</strong>
            {selectedCountryName}
          </span>
          <span className="app-shell__filter-pill">
            <strong>카테고리</strong>
            {selectedCategory?.label ?? '선택 중'}
          </span>
        </div>
        <p className="app-shell__filter-summary-text">
          한 번의 모달에서 국가와 카테고리를 같이 바꾸고 바로 차트에 반영할 수 있습니다.
        </p>
      </div>
    </section>
  );

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
              국가와 카테고리 선택
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
              {selectedCountryName}
            </span>
            <span className="app-shell__filter-pill">
              <strong>현재 카테고리</strong>
              {selectedCategory?.label ?? '선택 중'}
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
                <p className="app-shell__section-eyebrow">Category</p>
                <h3 className="app-shell__modal-field-title">카테고리</h3>
              </div>
              <SearchBar
                ariaLabel="카테고리 선택"
                disabled={isVideoCategoriesLoading || isVideoCategoriesError || categoryOptions.length === 0}
                emptyLabel={
                  isVideoCategoriesLoading
                    ? '카테고리를 불러오는 중입니다.'
                    : isVideoCategoriesError
                      ? '카테고리를 불러오지 못했습니다.'
                      : '표시할 카테고리가 없습니다.'
                }
                helperText={categoryFilterHelperText}
                onChange={handleSelectCategory}
                options={categoryOptions}
                value={selectedCategory?.id ?? ''}
              />
            </div>
          </div>
        </div>

        <div className="app-shell__modal-footer">
          <button className="app-shell__modal-action" onClick={handleCompleteFilterSelection} type="button">
            선택 완료
          </button>
        </div>
      </section>
    </div>
  ) : null;

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
              <div className="app-shell__stage-tags" aria-label="현재 재생 정보">
                <span className="app-shell__stage-tag">{selectedCountryName}</span>
                {selectedCategory ? (
                  <span className="app-shell__stage-tag">{selectedCategory.label}</span>
                ) : null}
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
        trendSignalsByVideoId={trendSignalsByVideoId}
      />
    </section>
  );

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <p className="app-shell__eyebrow">Global Trending Video Curation</p>
        <h1 className="app-shell__title">YouTube Atlas</h1>
        <p className="app-shell__subtitle">
          지금은 <strong>{selectedCountryName}</strong> 인기 영상을 보고 있습니다. 군더더기 없이
          탐색하고, 바로 재생하고, 빠르게 전환할 수 있게 정리했습니다.
        </p>
      </header>
      <main className="app-shell__main">
        {isMobileLayout ? (
          <>
            {filterSummaryContent}
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
                data-active={isFilterModalOpen}
                onClick={openFilterModal}
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
            {mobileTab === 'chat' ? communityContent : null}
          </>
        ) : (
          <>
            {filterSummaryContent}
            {playerContent}
            {chartContent}
            {communityContent}
          </>
        )}
      </main>
      {filterModalContent}
    </div>
  );
}

export default App;
