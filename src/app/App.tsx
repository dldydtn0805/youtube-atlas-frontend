import { useEffect, useState } from 'react';
import SearchBar from '../components/SearchBar/SearchBar';
import VideoList from '../components/VideoList/VideoList';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import countryCodes from '../constants/countryCodes';
import { usePopularVideos } from '../features/youtube/queries';
import '../styles/app.css';

const DEFAULT_REGION_CODE = 'US';
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

function App() {
  const [selectedRegionCode, setSelectedRegionCode] = useState(getInitialRegionCode);
  const [selectedVideoId, setSelectedVideoId] = useState<string>();
  const { data, isLoading, isError, error } = usePopularVideos(selectedRegionCode);
  const selectedCountryName =
    countryCodes.find((country) => country.code === selectedRegionCode)?.name ?? selectedRegionCode;

  useEffect(() => {
    const firstVideoId = data?.items[0]?.id;

    if (!firstVideoId) {
      setSelectedVideoId(undefined);
      return;
    }

    const hasSelectedVideo = data.items.some((item) => item.id === selectedVideoId);

    if (!hasSelectedVideo) {
      setSelectedVideoId(firstVideoId);
    }
  }, [data, selectedVideoId]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, selectedRegionCode);
  }, [selectedRegionCode]);

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
            onSelectRegion={setSelectedRegionCode}
          />
        </section>

        <section className="app-shell__panel app-shell__panel--player">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Now Playing</p>
            <h2 className="app-shell__section-title">{selectedCountryName} 인기 영상</h2>
          </div>
          <VideoPlayer selectedVideoId={selectedVideoId} />
        </section>

        <section className="app-shell__panel">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Chart</p>
            <h2 className="app-shell__section-title">인기 영상 목록</h2>
          </div>
          <VideoList
            errorMessage={error instanceof Error ? error.message : undefined}
            isError={isError}
            isLoading={isLoading}
            items={data?.items ?? []}
            onSelectVideo={setSelectedVideoId}
            selectedVideoId={selectedVideoId}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
