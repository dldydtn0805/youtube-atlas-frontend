import { useEffect, useRef, useState } from 'react';
import CommentSection from '../components/CommentSection/CommentSection';
import SearchBar from '../components/SearchBar/SearchBar';
import VideoList from '../components/VideoList/VideoList';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import countryCodes from '../constants/countryCodes';
import { videoCategories } from '../constants/videoCategories';
import { YouTubeCategorySection } from '../features/youtube/types';
import { usePopularVideosByCategory } from '../features/youtube/queries';
import '../styles/app.css';

const DEFAULT_REGION_CODE = 'US';
const DEFAULT_CATEGORY_ID = videoCategories[0]?.id ?? '10';
const MOBILE_BREAKPOINT = 768;
const STORAGE_KEY = 'youtube-atlas-region-code';
const CINEMATIC_MODE_STORAGE_KEY = 'youtube-atlas-cinematic-mode';
type RegionCode = (typeof countryCodes)[number]['code'];
type MobileTab = 'browse' | 'chart' | 'chat';

const SUPPORTED_REGION_CODES = new Set<string>(countryCodes.map((country) => country.code));
const sortedVideoCategories = [...videoCategories].sort((left, right) =>
  left.label.localeCompare(right.label, 'ko'),
);

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

function NextIcon() {
  return (
    <svg aria-hidden="true" className="app-shell__button-icon" viewBox="0 0 24 24">
      <path
        d="M8 6.5 15 12l-7 5.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M17 6.5v11"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
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
    data,
    fetchNextPage,
    hasNextPage = false,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = usePopularVideosByCategory(selectedRegionCode, selectedCategoryId);
  const selectedSection = mergeSections(data?.pages);
  const selectedVideo = selectedSection?.items.find((item) => item.id === selectedVideoId);
  const selectedCategory =
    videoCategories.find((category) => category.id === selectedCategoryId) ?? videoCategories[0];
  const selectedCountryName =
    countryCodes.find((country) => country.code === selectedRegionCode)?.name ?? selectedRegionCode;
  const isDesktopCinematicMode = !isMobileLayout && isCinematicMode;
  const canPlayNextVideo = (selectedSection?.items.length ?? 0) > 1;
  const showNextButton = !isMobileLayout && isDesktopCinematicMode;
  const cinematicToggleLabel = isDesktopCinematicMode ? '기본 보기' : '시네마틱 모드';

  function handleSelectVideo(videoId: string, triggerElement?: HTMLButtonElement) {
    shouldScrollToPlayerRef.current = true;
    setSelectedVideoId(videoId);
    triggerElement?.blur();
  }

  function handleSelectCategory(categoryId: string, triggerElement?: HTMLButtonElement) {
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

  const filtersContent = (
    <div className="app-shell__mobile-stack">
      <section className="app-shell__panel app-shell__panel--filters">
        <div className="app-shell__section-heading">
          <p className="app-shell__section-eyebrow">Region</p>
          <h2 className="app-shell__section-title">국가 선택</h2>
        </div>
        <SearchBar
          selectedRegionCode={selectedRegionCode}
          onSelectRegion={handleSelectRegion}
        />
      </section>

      <section className="app-shell__panel app-shell__panel--filters">
        <div className="app-shell__section-heading">
          <p className="app-shell__section-eyebrow">Category</p>
          <h2 className="app-shell__section-title">카테고리 선택</h2>
        </div>
        <div className="category-picker" aria-label="영상 카테고리 선택">
          {sortedVideoCategories.map((category) => (
            <button
              key={category.id}
              className="category-picker__button"
              data-active={selectedCategoryId === category.id}
              onClick={(event) => handleSelectCategory(category.id, event.currentTarget)}
              type="button"
            >
              <span className="category-picker__label">{category.label}</span>
              <span className="category-picker__description">{category.description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
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
            {showNextButton ? (
              <button
                aria-label="다음 영상"
                className="app-shell__next-button"
                data-icon-only={isMobileLayout}
                disabled={!canPlayNextVideo}
                onClick={handlePlayNextVideo}
                title="다음 영상"
                type="button"
              >
                {isMobileLayout ? <NextIcon /> : '다음 영상'}
              </button>
            ) : null}
          </div>
        </div>
        <div ref={playerViewportRef} className="app-shell__player-viewport">
          <VideoPlayer
            isLoading={isLoading}
            isCinematic={isDesktopCinematicMode}
            isMobileCinematic={false}
            showOverlayNavigation={isMobileLayout}
            isPortrait={false}
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
        <p className="app-shell__section-eyebrow">Community</p>
        <h2 className="app-shell__section-title">실시간 익명 채팅</h2>
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
        <p className="app-shell__section-eyebrow">Chart</p>
        <h2 className="app-shell__section-title">
          {selectedCategory?.label ?? '선택한 카테고리'} 인기 영상
        </h2>
      </div>
      <VideoList
        errorMessage={error instanceof Error ? error.message : undefined}
        hasNextPage={hasNextPage}
        isError={isError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        onLoadMore={() => void fetchNextPage()}
        section={selectedSection}
        onSelectVideo={handleSelectVideo}
        selectedVideoId={selectedVideoId}
      />
    </section>
  );

  return (
    <div className="app-shell" data-mobile-cinematic="false">
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
            <section className="app-shell__panel">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Region</p>
                <h2 className="app-shell__section-title">국가 선택</h2>
              </div>
              <SearchBar
                selectedRegionCode={selectedRegionCode}
                onSelectRegion={handleSelectRegion}
              />
            </section>

            <section className="app-shell__panel">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Category</p>
                <h2 className="app-shell__section-title">카테고리 선택</h2>
              </div>
              <div className="category-picker" aria-label="영상 카테고리 선택">
                {sortedVideoCategories.map((category) => (
                  <button
                    key={category.id}
                    className="category-picker__button"
                    data-active={selectedCategoryId === category.id}
                    onClick={(event) => handleSelectCategory(category.id, event.currentTarget)}
                    type="button"
                  >
                    <span className="category-picker__label">{category.label}</span>
                    <span className="category-picker__description">{category.description}</span>
                  </button>
                ))}
              </div>
            </section>

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
                    {isDesktopCinematicMode ? (
                      <button
                        className="app-shell__next-button"
                        disabled={!canPlayNextVideo}
                        onClick={handlePlayNextVideo}
                        type="button"
                      >
                        다음 영상
                      </button>
                    ) : null}
                    <button
                      className="app-shell__mode-toggle"
                      data-active={isDesktopCinematicMode}
                      onClick={handleToggleCinematicMode}
                      type="button"
                    >
                      {isDesktopCinematicMode ? '기본 보기' : '시네마틱 모드'}
                    </button>
                  </div>
                </div>
                <VideoPlayer
                  isLoading={isLoading}
                  isCinematic={isDesktopCinematicMode}
                  isMobileCinematic={false}
                  showOverlayNavigation={false}
                  isPortrait={false}
                  onPreviousVideo={handlePlayPreviousVideo}
                  onNextVideo={handlePlayNextVideo}
                  selectedVideoId={selectedVideoId}
                  onVideoEnd={handleVideoEnd}
                  canNavigateVideos={canPlayNextVideo}
                />
                {selectedVideo ? (
                  <div className="app-shell__stage-meta">
                    <div className="app-shell__stage-copy">
                      <h3 className="app-shell__stage-title">{selectedVideo.snippet.title}</h3>
                      <p className="app-shell__stage-channel">{selectedVideo.snippet.channelTitle}</p>
                    </div>
                    <div className="app-shell__stage-tags" aria-label="현재 재생 정보">
                      <span className="app-shell__stage-tag">{selectedCountryName}</span>
                      {selectedCategory ? (
                        <span className="app-shell__stage-tag">{selectedCategory.label}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>

            <section className="app-shell__panel">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Community</p>
                <h2 className="app-shell__section-title">실시간 익명 채팅</h2>
              </div>
              <CommentSection
                videoId={selectedVideoId}
                videoTitle={selectedVideo?.snippet.title}
              />
            </section>

            <section className="app-shell__panel">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Chart</p>
                <h2 className="app-shell__section-title">
                  {selectedCategory?.label ?? '선택한 카테고리'} 인기 영상
                </h2>
              </div>
              <VideoList
                errorMessage={error instanceof Error ? error.message : undefined}
                hasNextPage={hasNextPage}
                isError={isError}
                isFetchingNextPage={isFetchingNextPage}
                isLoading={isLoading}
                onLoadMore={() => void fetchNextPage()}
                section={selectedSection}
                onSelectVideo={handleSelectVideo}
                selectedVideoId={selectedVideoId}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
