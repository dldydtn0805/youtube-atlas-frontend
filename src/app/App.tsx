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
const STORAGE_KEY = 'youtube-atlas-region-code';
type RegionCode = (typeof countryCodes)[number]['code'];

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
  const playerSectionRef = useRef<HTMLElement | null>(null);
  const shouldScrollToPlayerRef = useRef(false);
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
    triggerElement?.blur();
  }

  function handleSelectRegion(regionCode: RegionCode) {
    setSelectedRegionCode(regionCode);
    setSelectedVideoId(undefined);
  }

  function handleVideoEnd() {
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
    window.localStorage.setItem(STORAGE_KEY, selectedRegionCode);
  }, [selectedRegionCode]);

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

        <section
          ref={playerSectionRef}
          className="app-shell__panel app-shell__panel--player"
        >
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Now Playing</p>
            <h2 className="app-shell__section-title">
              {selectedCountryName} 인기 영상
              {selectedCategory ? ` · ${selectedCategory.label}` : ''}
            </h2>
          </div>
          <VideoPlayer
            isLoading={isLoading}
            selectedVideoId={selectedVideoId}
            onVideoEnd={handleVideoEnd}
          />
        </section>

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
      </main>
    </div>
  );
}

export default App;
