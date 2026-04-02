import countryCodes from '../../constants/countryCodes';
import { ALL_VIDEO_CATEGORY_ID } from '../../constants/videoCategories';
import type { PlaybackProgress } from '../../features/playback/types';
import { formatCompactCount } from '../../features/trending/presentation';
import type { RealtimeSurgingResponse, VideoTrendSignal } from '../../features/trending/types';
import type { YouTubeCategorySection, YouTubeVideoItem } from '../../features/youtube/types';

export const DEFAULT_REGION_CODE = 'US';
export const DEFAULT_CATEGORY_ID = ALL_VIDEO_CATEGORY_ID;
export const MOBILE_BREAKPOINT = 768;
export const REALTIME_SURGING_QUEUE_ID = 'realtime-surging';
export const RESTORED_PLAYBACK_QUEUE_ID = 'last-playback-progress';
const STORAGE_KEY = 'youtube-atlas-region-code';
const CINEMATIC_MODE_STORAGE_KEY = 'youtube-atlas-cinematic-mode';
const THEME_MODE_STORAGE_KEY = 'youtube-atlas-theme-mode';

export const FAVORITE_STREAMER_VIDEO_SECTION: YouTubeCategorySection = {
  categoryId: 'favorite-streamers',
  description: '전체 인기 영상 중 즐겨찾기한 채널의 영상만 모았습니다.',
  items: [],
  label: '즐겨찾기 채널',
};

export type RegionCode = (typeof countryCodes)[number]['code'];
export type ThemeMode = 'light' | 'dark';
export interface PendingPlaybackRestore {
  restoreId: number;
  videoId: string;
  positionSeconds: number;
}

const SUPPORTED_REGION_CODES = new Set<string>(countryCodes.map((country) => country.code));

export const sortedCountryCodes = [...countryCodes].sort((left, right) =>
  left.name.localeCompare(right.name, 'ko'),
);

export function isSupportedRegionCode(regionCode: string): regionCode is RegionCode {
  return SUPPORTED_REGION_CODES.has(regionCode);
}

export function getInitialRegionCode(): RegionCode {
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

export function getInitialCinematicMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(CINEMATIC_MODE_STORAGE_KEY) === 'true';
}

export function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedThemeMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);

  if (storedThemeMode === 'light' || storedThemeMode === 'dark') {
    return storedThemeMode;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getInitialIsMobileLayout() {
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

export function getFullscreenElement() {
  const fullscreenDocument = document as FullscreenCapableDocument;

  return document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null;
}

export async function requestElementFullscreen(element: HTMLElement) {
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

export async function exitElementFullscreen() {
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

export function scrollElementToViewportCenter(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const centeredTop = window.scrollY + rect.top - Math.max((viewportHeight - rect.height) / 2, 0);

  window.scrollTo({
    top: Math.max(centeredTop, 0),
    behavior: 'smooth',
  });
}

export function mergeSections(pages: YouTubeCategorySection[] | undefined) {
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

export function mapPlaybackProgressToVideoItem(playbackProgress: PlaybackProgress): YouTubeVideoItem {
  return {
    id: playbackProgress.videoId,
    contentDetails: {
      duration: '',
    },
    snippet: {
      title: playbackProgress.videoTitle ?? '',
      channelTitle: playbackProgress.channelTitle ?? '',
      channelId: '',
      categoryId: RESTORED_PLAYBACK_QUEUE_ID,
      thumbnails: createFallbackThumbnails(playbackProgress.thumbnailUrl ?? ''),
    },
  };
}

export function getVideoThumbnailUrl(video: YouTubeVideoItem) {
  return (
    video.snippet.thumbnails.maxres?.url ??
    video.snippet.thumbnails.standard?.url ??
    video.snippet.thumbnails.high.url ??
    video.snippet.thumbnails.medium.url ??
    video.snippet.thumbnails.default.url ??
    null
  );
}

export function mapTrendSignalToVideoItem(signal: VideoTrendSignal): YouTubeVideoItem {
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

export function buildRealtimeSurgingSection(
  isAllCategorySelected: boolean,
  realtimeSurgingData: RealtimeSurgingResponse | undefined,
) {
  if (!isAllCategorySelected || !realtimeSurgingData) {
    return undefined;
  }

  return {
    categoryId: REALTIME_SURGING_QUEUE_ID,
    label: '실시간 급상승',
    description: `전체 차트에서 직전 집계 대비 순위가 ${realtimeSurgingData.rankChangeThreshold}계단 이상 오른 영상을 모았습니다.`,
    items: realtimeSurgingData.items.map(mapTrendSignalToVideoItem),
  };
}

export function mergeUniqueVideoItems(...groups: Array<YouTubeVideoItem[] | undefined>) {
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

export function getPlaybackQueueItems(
  queueId: string | undefined,
  {
    favoriteStreamerVideoSection,
    realtimeSurgingSection,
    restoredPlaybackVideo,
    selectedSection,
  }: {
    favoriteStreamerVideoSection?: YouTubeCategorySection;
    realtimeSurgingSection?: YouTubeCategorySection;
    restoredPlaybackVideo?: YouTubeVideoItem;
    selectedSection?: YouTubeCategorySection;
  },
) {
  if (queueId === RESTORED_PLAYBACK_QUEUE_ID) {
    return restoredPlaybackVideo ? [restoredPlaybackVideo] : [];
  }

  if (queueId && realtimeSurgingSection?.categoryId === queueId) {
    return realtimeSurgingSection.items;
  }

  if (queueId && favoriteStreamerVideoSection?.categoryId === queueId) {
    return favoriteStreamerVideoSection.items;
  }

  if (queueId && selectedSection?.categoryId === queueId) {
    return selectedSection.items;
  }

  return [];
}

export function findPlaybackQueueIdForVideo(
  videoId: string | undefined,
  {
    favoriteStreamerVideoSection,
    realtimeSurgingSection,
    selectedSection,
  }: {
    favoriteStreamerVideoSection?: YouTubeCategorySection;
    realtimeSurgingSection?: YouTubeCategorySection;
    selectedSection?: YouTubeCategorySection;
  },
) {
  if (!videoId) {
    return undefined;
  }

  if (realtimeSurgingSection?.items.some((item) => item.id === videoId)) {
    return realtimeSurgingSection.categoryId;
  }

  if (favoriteStreamerVideoSection?.items.some((item) => item.id === videoId)) {
    return favoriteStreamerVideoSection.categoryId;
  }

  if (selectedSection?.items.some((item) => item.id === videoId)) {
    return selectedSection.categoryId;
  }

  return undefined;
}

export function formatVideoViewCount(viewCount?: string) {
  if (!viewCount) {
    return undefined;
  }

  const parsedViewCount = Number(viewCount);

  if (!Number.isFinite(parsedViewCount) || parsedViewCount < 0) {
    return undefined;
  }

  return formatCompactCount(parsedViewCount);
}

export function persistRegionCode(regionCode: RegionCode) {
  window.localStorage.setItem(STORAGE_KEY, regionCode);
}

export function persistCinematicMode(isCinematicMode: boolean) {
  window.localStorage.setItem(CINEMATIC_MODE_STORAGE_KEY, String(isCinematicMode));
}

export function persistThemeMode(themeMode: ThemeMode) {
  window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
}
