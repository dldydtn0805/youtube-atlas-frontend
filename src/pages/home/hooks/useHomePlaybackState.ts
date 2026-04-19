import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { VideoPlayerHandle } from '../../../components/VideoPlayer/VideoPlayer';
import type { VideoCategory } from '../../../constants/videoCategories';
import type { AuthStatus, AuthUser } from '../../../features/auth/types';
import { upsertPlaybackProgress } from '../../../features/playback/api';
import { useVideoById } from '../../../features/youtube/queries';
import type { YouTubeCategorySection, YouTubeVideoItem } from '../../../features/youtube/types';
import { ApiRequestError, isApiConfigured } from '../../../lib/api';
import usePlaybackQueue from './usePlaybackQueue';
import {
  getVideoThumbnailUrl,
  mapPlaybackProgressToVideoItem,
  mergeUniqueVideoItems,
  type PendingPlaybackRestore,
} from '../utils';
import { formatPlaybackSaveTimestamp } from '../gameHelpers';

const ENABLE_PLAYBACK_PROGRESS = true;
const PLAYBACK_PROGRESS_AUTOSAVE_INTERVAL_MS = 60000;

interface UseHomePlaybackStateOptions {
  accessToken: string | null;
  authStatus: AuthStatus;
  extraPlaybackSections?: YouTubeCategorySection[];
  favoriteStreamerVideoSection?: YouTubeCategorySection;
  gamePortfolioSection: YouTubeCategorySection;
  historyPlaybackSection?: YouTubeCategorySection;
  isMobileLayout: boolean;
  logout: () => Promise<void>;
  newChartEntriesSection?: YouTubeCategorySection;
  preferredInitialPlaybackFallbackSection?: YouTubeCategorySection;
  preferredInitialPlaybackFallbackSectionLoading?: boolean;
  preferredInitialPlaybackSection?: YouTubeCategorySection;
  preferredInitialPlaybackSectionLoading?: boolean;
  preferredInitialPlaybackSectionSelectionKey?: string | null;
  realtimeSurgingSection?: YouTubeCategorySection;
  scrollToPlayerTop: () => void;
  selectedCategoryId: string;
  selectedPlaybackSection?: YouTubeCategorySection;
  setSelectedCategoryId: (categoryId: string) => void;
  sortedVideoCategories: VideoCategory[];
  user: AuthUser | null;
  videoPlayerRef: RefObject<VideoPlayerHandle | null>;
}

interface UseHomePlaybackStateResult {
  activePlaybackQueueId: string;
  canPlayNextVideo: boolean;
  handleManualPlaybackSave: () => Promise<void>;
  handlePlaybackRestoreApplied: (restoreId: number) => void;
  handlePlayNextVideo: () => void;
  handlePlayPreviousVideo: () => void;
  handleSelectCategory: (
    categoryId: string,
    triggerElement?: HTMLButtonElement,
  ) => void;
  handleSelectVideo: (
    videoId: string,
    playbackQueueId: string,
    triggerElement?: HTMLButtonElement,
  ) => void;
  syncPlaybackSelection: (videoId: string, playbackQueueId: string) => void;
  isRestoredPlaybackActive: boolean;
  isManualPlaybackSavePending: boolean;
  manualPlaybackSaveStatus: string | null;
  pendingPlaybackRestore: PendingPlaybackRestore | null;
  resetForRegionChange: () => void;
  resolvedSelectedVideo?: YouTubeVideoItem;
  selectedVideoId?: string;
}

export default function useHomePlaybackState({
  accessToken,
  authStatus,
  extraPlaybackSections,
  favoriteStreamerVideoSection,
  gamePortfolioSection,
  historyPlaybackSection,
  isMobileLayout,
  logout,
  newChartEntriesSection,
  preferredInitialPlaybackFallbackSection,
  preferredInitialPlaybackFallbackSectionLoading,
  preferredInitialPlaybackSection,
  preferredInitialPlaybackSectionLoading,
  preferredInitialPlaybackSectionSelectionKey,
  realtimeSurgingSection,
  scrollToPlayerTop,
  selectedCategoryId,
  selectedPlaybackSection,
  setSelectedCategoryId,
  sortedVideoCategories,
  user,
  videoPlayerRef,
}: UseHomePlaybackStateOptions): UseHomePlaybackStateResult {
  const [isManualPlaybackSavePending, setIsManualPlaybackSavePending] = useState(false);
  const [manualPlaybackSaveStatus, setManualPlaybackSaveStatus] = useState<string | null>(null);
  const lastPersistedPlaybackSecondsRef = useRef<Record<string, number>>({});

  const restoredPlaybackVideo = ENABLE_PLAYBACK_PROGRESS && user?.lastPlaybackProgress
    ? mapPlaybackProgressToVideoItem(user.lastPlaybackProgress)
    : undefined;
  const combinedPlayableItems = useMemo(
    () =>
      mergeUniqueVideoItems(
        realtimeSurgingSection?.items,
        newChartEntriesSection?.items,
        selectedPlaybackSection?.items,
        ...(extraPlaybackSections?.map((section) => section.items) ?? []),
        favoriteStreamerVideoSection?.items,
        gamePortfolioSection.items,
        historyPlaybackSection?.items,
        restoredPlaybackVideo ? [restoredPlaybackVideo] : undefined,
      ),
    [
      favoriteStreamerVideoSection?.items,
      gamePortfolioSection.items,
      historyPlaybackSection?.items,
      newChartEntriesSection?.items,
      extraPlaybackSections,
      realtimeSurgingSection?.items,
      restoredPlaybackVideo,
      selectedPlaybackSection?.items,
    ],
  );
  const {
    activePlaybackQueueId,
    canPlayNextVideo,
    handlePlayNextVideo,
    handlePlayPreviousVideo,
    handleSelectCategory,
    handleSelectVideo,
    resetForRegionChange,
    syncPlaybackSelection,
    selectedVideoId,
  } = usePlaybackQueue({
    autoSelectFirstVideoWhenEmpty: authStatus !== 'loading',
    extraPlaybackSections,
    favoriteStreamerVideoSection,
    gamePortfolioSection,
    historyPlaybackSection,
    isMobileLayout,
    newChartEntriesSection,
    preferredInitialPlaybackFallbackSection,
    preferredInitialPlaybackFallbackSectionLoading,
    preferredInitialPlaybackSection,
    preferredInitialPlaybackSectionLoading,
    preferredInitialPlaybackSectionSelectionKey,
    realtimeSurgingSection,
    restoredPlaybackVideo,
    scrollToPlayerTop,
    selectedCategoryId,
    selectedSection: selectedPlaybackSection,
    setSelectedCategoryId,
    sortedVideoCategories,
  });
  const selectedVideo = combinedPlayableItems.find((item) => item.id === selectedVideoId);
  const shouldLoadSelectedVideoDetail =
    isApiConfigured &&
    Boolean(selectedVideoId) &&
    (!selectedVideo?.statistics?.viewCount || !selectedVideo?.snippet.channelId?.trim());
  const { data: selectedVideoDetail } = useVideoById(selectedVideoId, shouldLoadSelectedVideoDetail);
  const resolvedSelectedVideo =
    selectedVideo && selectedVideoDetail
      ? {
          ...selectedVideoDetail,
          ...selectedVideo,
          statistics: selectedVideo.statistics ?? selectedVideoDetail.statistics,
          snippet: {
            ...selectedVideoDetail.snippet,
            ...selectedVideo.snippet,
            channelId: selectedVideo.snippet.channelId || selectedVideoDetail.snippet.channelId,
            channelTitle: selectedVideo.snippet.channelTitle || selectedVideoDetail.snippet.channelTitle,
            title: selectedVideo.snippet.title || selectedVideoDetail.snippet.title,
          },
        }
      : selectedVideoDetail ?? selectedVideo;

  useEffect(() => {
    if (authStatus === 'authenticated') {
      return;
    }

    lastPersistedPlaybackSecondsRef.current = {};
    setIsManualPlaybackSavePending(false);
    setManualPlaybackSaveStatus(null);
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

  const handlePlaybackRestoreApplied = useCallback((_restoreId: number) => {}, []);

  const persistPlaybackProgress = useCallback(
    async (
      videoId: string,
      positionSeconds: number,
      options?: {
        force?: boolean;
        keepalive?: boolean;
      },
    ) => {
      if (!ENABLE_PLAYBACK_PROGRESS || authStatus !== 'authenticated' || !accessToken) {
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
        }, { keepalive: options?.keepalive });
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

  const persistCurrentPlaybackSnapshot = useCallback(
    async (options?: { force?: boolean; keepalive?: boolean }) => {
      const snapshot = videoPlayerRef.current?.readPlaybackSnapshot();

      if (!snapshot) {
        return null;
      }

      return persistPlaybackProgress(snapshot.videoId, snapshot.positionSeconds, options);
    },
    [persistPlaybackProgress, videoPlayerRef],
  );

  const persistCurrentPlaybackBeforeSwitch = useCallback(
    (nextVideoId?: string) => {
      const snapshot = videoPlayerRef.current?.readPlaybackSnapshot();

      if (!snapshot || snapshot.videoId === nextVideoId) {
        return;
      }

      void persistPlaybackProgress(snapshot.videoId, snapshot.positionSeconds, { force: true })
        .catch(() => undefined);
    },
    [persistPlaybackProgress, videoPlayerRef],
  );

  const handleSelectCategoryWithRestoreReset = useCallback(
    (categoryId: string, triggerElement?: HTMLButtonElement) => {
      persistCurrentPlaybackBeforeSwitch();
      handleSelectCategory(categoryId, triggerElement);
    },
    [handleSelectCategory, persistCurrentPlaybackBeforeSwitch],
  );

  const handleSelectVideoWithRestoreReset = useCallback(
    (videoId: string, playbackQueueId: string, triggerElement?: HTMLButtonElement) => {
      persistCurrentPlaybackBeforeSwitch(videoId);
      handleSelectVideo(videoId, playbackQueueId, triggerElement);
    },
    [handleSelectVideo, persistCurrentPlaybackBeforeSwitch],
  );

  const handlePlayNextVideoWithRestoreReset = useCallback(() => {
    persistCurrentPlaybackBeforeSwitch();
    handlePlayNextVideo();
  }, [handlePlayNextVideo, persistCurrentPlaybackBeforeSwitch]);

  const handlePlayPreviousVideoWithRestoreReset = useCallback(() => {
    persistCurrentPlaybackBeforeSwitch();
    handlePlayPreviousVideo();
  }, [handlePlayPreviousVideo, persistCurrentPlaybackBeforeSwitch]);

  const syncPlaybackSelectionWithRestoreReset = useCallback(
    (videoId: string, playbackQueueId: string) => {
      persistCurrentPlaybackBeforeSwitch(videoId);
      syncPlaybackSelection(videoId, playbackQueueId);
    },
    [persistCurrentPlaybackBeforeSwitch, syncPlaybackSelection],
  );

  useEffect(() => {
    if (!ENABLE_PLAYBACK_PROGRESS || authStatus !== 'authenticated' || !selectedVideoId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void persistCurrentPlaybackSnapshot();
    }, PLAYBACK_PROGRESS_AUTOSAVE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [authStatus, persistCurrentPlaybackSnapshot, selectedVideoId]);

  useEffect(() => {
    if (!ENABLE_PLAYBACK_PROGRESS || authStatus !== 'authenticated') {
      return undefined;
    }

    const handlePageHide = () => {
      void persistCurrentPlaybackSnapshot({ force: true, keepalive: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void persistCurrentPlaybackSnapshot({ force: true, keepalive: true });
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authStatus, persistCurrentPlaybackSnapshot]);

  const handleManualPlaybackSave = useCallback(async () => {
    if (!ENABLE_PLAYBACK_PROGRESS) {
      setManualPlaybackSaveStatus('재생 위치 저장을 사용하지 않습니다.');
      return;
    }

    if (authStatus !== 'authenticated' || !selectedVideoId) {
      setManualPlaybackSaveStatus('로그인 후 저장할 수 있습니다.');
      return;
    }

    const snapshot = videoPlayerRef.current?.readPlaybackSnapshot();

    if (!snapshot) {
      setManualPlaybackSaveStatus('플레이어 준비 후 다시 저장해 주세요.');
      return;
    }

    setIsManualPlaybackSavePending(true);
    setManualPlaybackSaveStatus(null);

    try {
      const savedPositionSeconds = await persistPlaybackProgress(
        snapshot.videoId,
        snapshot.positionSeconds,
        {
          force: true,
        },
      );

      if (savedPositionSeconds === null) {
        setManualPlaybackSaveStatus('저장할 재생 위치를 찾지 못했습니다.');
        return;
      }

      setManualPlaybackSaveStatus(
        `${formatPlaybackSaveTimestamp(savedPositionSeconds)} 지점까지 저장했습니다.`,
      );
    } catch (error) {
      setManualPlaybackSaveStatus(
        error instanceof Error ? error.message : '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsManualPlaybackSavePending(false);
    }
  }, [authStatus, persistPlaybackProgress, selectedVideoId, videoPlayerRef]);

  return {
    activePlaybackQueueId,
    canPlayNextVideo,
    handleManualPlaybackSave,
    handlePlaybackRestoreApplied,
    handlePlayNextVideo: handlePlayNextVideoWithRestoreReset,
    handlePlayPreviousVideo: handlePlayPreviousVideoWithRestoreReset,
    handleSelectCategory: handleSelectCategoryWithRestoreReset,
    handleSelectVideo: handleSelectVideoWithRestoreReset,
    isRestoredPlaybackActive: false,
    isManualPlaybackSavePending,
    manualPlaybackSaveStatus,
    pendingPlaybackRestore: null as PendingPlaybackRestore | null,
    resetForRegionChange,
    resolvedSelectedVideo,
    selectedVideoId,
    syncPlaybackSelection: syncPlaybackSelectionWithRestoreReset,
  };
}
