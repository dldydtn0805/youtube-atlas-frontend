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
  findPlaybackQueueIdForVideo,
  getVideoThumbnailUrl,
  mapPlaybackProgressToVideoItem,
  mergeUniqueVideoItems,
  RESTORED_PLAYBACK_QUEUE_ID,
  type PendingPlaybackRestore,
} from '../utils';
import { formatPlaybackSaveTimestamp } from '../gameHelpers';

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
  isRestoredPlaybackActive: boolean;
  isManualPlaybackSavePending: boolean;
  manualPlaybackSaveStatus: string | null;
  pendingPlaybackRestore: PendingPlaybackRestore | null;
  resetForRegionChange: () => void;
  resolvedSelectedVideo?: YouTubeVideoItem;
  selectedVideoId?: string;
}

function getPlaybackQueueIdForVideo(
  videoId: string | undefined,
  sections: {
    extraPlaybackSections?: YouTubeCategorySection[];
    favoriteStreamerVideoSection?: YouTubeCategorySection;
    gamePortfolioSection: YouTubeCategorySection;
    historyPlaybackSection?: YouTubeCategorySection;
    newChartEntriesSection?: YouTubeCategorySection;
    realtimeSurgingSection?: YouTubeCategorySection;
    selectedPlaybackSection?: YouTubeCategorySection;
  },
) {
  return (
    findPlaybackQueueIdForVideo(videoId, {
      extraSections: sections.extraPlaybackSections,
      favoriteStreamerVideoSection: sections.favoriteStreamerVideoSection,
      gamePortfolioSection: sections.gamePortfolioSection,
      historyPlaybackSection: sections.historyPlaybackSection,
      newChartEntriesSection: sections.newChartEntriesSection,
      realtimeSurgingSection: sections.realtimeSurgingSection,
      selectedSection: sections.selectedPlaybackSection,
    }) ?? RESTORED_PLAYBACK_QUEUE_ID
  );
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
  realtimeSurgingSection,
  scrollToPlayerTop,
  selectedCategoryId,
  selectedPlaybackSection,
  setSelectedCategoryId,
  sortedVideoCategories,
  user,
  videoPlayerRef,
}: UseHomePlaybackStateOptions): UseHomePlaybackStateResult {
  const [pendingPlaybackRestore, setPendingPlaybackRestore] = useState<PendingPlaybackRestore | null>(null);
  const [isRestoredPlaybackActive, setIsRestoredPlaybackActive] = useState(false);
  const [isManualPlaybackSavePending, setIsManualPlaybackSavePending] = useState(false);
  const [manualPlaybackSaveStatus, setManualPlaybackSaveStatus] = useState<string | null>(null);
  const nextPlaybackRestoreIdRef = useRef(0);
  const handledPlaybackRestoreSignatureRef = useRef<string | null>(null);
  const lastPersistedPlaybackSecondsRef = useRef<Record<string, number>>({});

  const restoredPlaybackVideo = user?.lastPlaybackProgress
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
    restorePlaybackSelection,
    selectedVideoId,
    updateActivePlaybackQueueId,
  } = usePlaybackQueue({
    autoSelectFirstVideoWhenEmpty: authStatus === 'anonymous',
    extraPlaybackSections,
    favoriteStreamerVideoSection,
    gamePortfolioSection,
    historyPlaybackSection,
    isMobileLayout,
    newChartEntriesSection,
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

    setIsRestoredPlaybackActive(false);
    handledPlaybackRestoreSignatureRef.current = null;
    lastPersistedPlaybackSecondsRef.current = {};
    setPendingPlaybackRestore(null);
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
    setIsRestoredPlaybackActive(true);
    restorePlaybackSelection(
      playbackProgress.videoId,
      getPlaybackQueueIdForVideo(playbackProgress.videoId, {
        extraPlaybackSections,
        favoriteStreamerVideoSection,
        gamePortfolioSection,
        historyPlaybackSection,
        newChartEntriesSection,
        realtimeSurgingSection,
        selectedPlaybackSection,
      }),
    );
  }, [
    authStatus,
    extraPlaybackSections,
    favoriteStreamerVideoSection,
    gamePortfolioSection,
    historyPlaybackSection,
    newChartEntriesSection,
    realtimeSurgingSection,
    restorePlaybackSelection,
    selectedPlaybackSection,
    user,
  ]);

  useEffect(() => {
    if (activePlaybackQueueId !== RESTORED_PLAYBACK_QUEUE_ID || !selectedVideoId) {
      return;
    }

    const matchedQueueId = getPlaybackQueueIdForVideo(selectedVideoId, {
      extraPlaybackSections,
      favoriteStreamerVideoSection,
      gamePortfolioSection,
      historyPlaybackSection,
      newChartEntriesSection,
      realtimeSurgingSection,
      selectedPlaybackSection,
    });

    if (matchedQueueId && matchedQueueId !== RESTORED_PLAYBACK_QUEUE_ID) {
      updateActivePlaybackQueueId(matchedQueueId);
    }
  }, [
    activePlaybackQueueId,
    extraPlaybackSections,
    favoriteStreamerVideoSection,
    gamePortfolioSection,
    historyPlaybackSection,
    newChartEntriesSection,
    realtimeSurgingSection,
    selectedPlaybackSection,
    selectedVideoId,
    updateActivePlaybackQueueId,
  ]);

  const handlePlaybackRestoreApplied = useCallback((restoreId: number) => {
    setPendingPlaybackRestore((currentRestore) =>
      currentRestore?.restoreId === restoreId ? null : currentRestore,
    );
  }, []);

  const handleSelectCategoryWithRestoreReset = useCallback(
    (categoryId: string, triggerElement?: HTMLButtonElement) => {
      setIsRestoredPlaybackActive(false);
      handleSelectCategory(categoryId, triggerElement);
    },
    [handleSelectCategory],
  );

  const handleSelectVideoWithRestoreReset = useCallback(
    (videoId: string, playbackQueueId: string, triggerElement?: HTMLButtonElement) => {
      setIsRestoredPlaybackActive(false);
      handleSelectVideo(videoId, playbackQueueId, triggerElement);
    },
    [handleSelectVideo],
  );

  const handlePlayNextVideoWithRestoreReset = useCallback(() => {
    setIsRestoredPlaybackActive(false);
    handlePlayNextVideo();
  }, [handlePlayNextVideo]);

  const handlePlayPreviousVideoWithRestoreReset = useCallback(() => {
    setIsRestoredPlaybackActive(false);
    handlePlayPreviousVideo();
  }, [handlePlayPreviousVideo]);

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
      const savedPositionSeconds = await persistPlaybackProgress(snapshot.videoId, snapshot.positionSeconds, {
        force: true,
      });

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
    isRestoredPlaybackActive,
    isManualPlaybackSavePending,
    manualPlaybackSaveStatus,
    pendingPlaybackRestore,
    resetForRegionChange,
    resolvedSelectedVideo,
    selectedVideoId,
  };
}
