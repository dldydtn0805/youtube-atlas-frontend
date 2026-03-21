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

function CinemaIcon() {
  return (
    <svg aria-hidden="true" className="app-shell__button-icon" viewBox="0 0 24 24">
      <path
        d="M4.5 6.5h15a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16V8a1.5 1.5 0 0 1 1.5-1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7.5 6.5v11M16.5 6.5v11M3 10h18M3 14h18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
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

  function handlePlayNextVideo() {
    if (!selectedSection || selectedSection.items.length === 0) {
      return;
    }

    const currentIndex = selectedSection.items.findIndex((item) => item.id === selectedVideoId);
    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + 1) % selectedSection.items.length
        : 0;

    setSelectedVideoId(selectedSection.items[nextIndex]?.id);
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
    if (!isCinematicMode || !shouldScrollOnModeChangeRef.current) {
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
  }, [isCinematicMode]);

  useEffect(() => {
    if (!selectedVideoId || !shouldScrollToPlayerRef.current) {
      return;
    }

    shouldScrollToPlayerRef.current = false;

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
  }, [selectedVideoId]);

  function handleToggleCinematicMode() {
    shouldScrollOnModeChangeRef.current = !isCinematicMode;
    setIsCinematicMode((current) => !current);
  }

  const isMobileCinematicMode = isMobileLayout && isCinematicMode;
  const shouldUsePortraitFit = isMobileCinematicMode;
  const canPlayNextVideo = (selectedSection?.items.length ?? 0) > 1;
  const showNextButton = isMobileLayout ? canPlayNextVideo : isCinematicMode;
  const cinematicToggleLabel = isCinematicMode
    ? isMobileLayout
      ? '일반'
      : '기본 보기'
    : isMobileLayout
      ? '시네마'
      : '시네마틱 모드';

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (!shouldUsePortraitFit) {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [shouldUsePortraitFit]);

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
          {videoCategories.map((category) => (
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
    <div className="app-shell__stage" data-cinematic={isCinematicMode}>
      <section
        ref={playerSectionRef}
        className="app-shell__panel app-shell__panel--player"
        data-cinematic={isCinematicMode}
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
            <button
              aria-label={cinematicToggleLabel}
              className="app-shell__mode-toggle"
              data-active={isCinematicMode}
              data-icon-only={isMobileLayout}
              onClick={handleToggleCinematicMode}
              title={cinematicToggleLabel}
              type="button"
            >
              {isMobileLayout ? <CinemaIcon /> : cinematicToggleLabel}
            </button>
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
        <VideoPlayer
          isLoading={isLoading}
          isCinematic={isCinematicMode}
          isPortrait={shouldUsePortraitFit}
          selectedVideoId={selectedVideoId}
          onVideoEnd={handleVideoEnd}
        />
        {selectedVideo ? (
          <div className="app-shell__stage-meta">
            <div className="app-shell__stage-copy">
              <h3 className="app-shell__stage-title">{selectedVideo.snippet.title}</h3>
              <p className="app-shell__stage-channel">{selectedVideo.snippet.channelTitle}</p>
            </div>
            {!isMobileCinematicMode ? (
              <div className="app-shell__stage-side">
                <div className="app-shell__stage-tags" aria-label="현재 재생 정보">
                  <span className="app-shell__stage-tag">{selectedCountryName}</span>
                  {selectedCategory ? (
                    <span className="app-shell__stage-tag">{selectedCategory.label}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
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
    <div
      className="app-shell"
      data-mobile-cinematic={isMobileCinematicMode}
      data-portrait-fit={shouldUsePortraitFit}
    >
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
            {!isMobileCinematicMode ? (
              <>
                <nav className="app-shell__mobile-tabs" aria-label="모바일 화면 전환">
                  <button
                    className="app-shell__mobile-tab"
                    data-active={mobileTab === 'chart'}
                    onClick={() => setMobileTab('chart')}
                    type="button"
                  >
                    목록
                  </button>
                  <button
                    className="app-shell__mobile-tab"
                    data-active={mobileTab === 'browse'}
                    onClick={() => setMobileTab('browse')}
                    type="button"
                  >
                    탐색
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
            ) : null}
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
                {videoCategories.map((category) => (
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

            <div className="app-shell__stage" data-cinematic={isCinematicMode}>
              <section
                ref={playerSectionRef}
                className="app-shell__panel app-shell__panel--player"
                data-cinematic={isCinematicMode}
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
                    {isCinematicMode ? (
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
                      data-active={isCinematicMode}
                      onClick={handleToggleCinematicMode}
                      type="button"
                    >
                      {isCinematicMode ? '기본 보기' : '시네마틱 모드'}
                    </button>
                  </div>
                </div>
                <VideoPlayer
                  isLoading={isLoading}
                  isCinematic={isCinematicMode}
                  isPortrait={shouldUsePortraitFit}
                  selectedVideoId={selectedVideoId}
                  onVideoEnd={handleVideoEnd}
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
