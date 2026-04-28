import { useCallback, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { gameQueryKeys, useGameLeaderboardPositionRankHistory, useGamePositionRankHistory } from '../../../features/game/queries';
import { fetchGamePositionRankHistory } from '../../../features/game/api';
import type {
  GameHighlight,
  GameNotification,
  GamePosition,
  GamePositionRankHistory,
  GameScheduledSellOrder,
} from '../../../features/game/types';
import { useVideoRankHistory } from '../../../features/trending/queries';
import { VIDEO_GAME_REGION_CODE } from '../../../constants/videoCategories';
import {
  createHighlightRankHistoryPosition,
  createScheduledSellOrderRankHistoryPosition,
  mergeMultiplePositionHistories,
} from '../homeRankHistory';
import { createRankHistoryPositionFromNotification } from '../homeGameNotifications';

type RankHistoryFocusMode = 'full' | 'trade';

interface UseHomeRankHistoryOptions {
  accessToken: string | null;
  gameHistoryPositions: GamePosition[];
  openGamePositions: GamePosition[];
  openRankHistoryModal: (videoId: string | undefined, position: GamePosition | null) => void;
  closeRankHistoryModal: () => void;
  removeModalGameNotification?: (notificationId: string) => void;
  selectedRankHistoryPosition: GamePosition | null;
  selectedRegionCode: string;
  selectedVideoHistoryTargetPosition: GamePosition | null;
  selectedVideoId?: string;
  selectedVideoRankHistoryVideoId: string | null;
  shouldLoadGame: boolean;
  userId?: number | null;
}

export default function useHomeRankHistory({
  accessToken,
  closeRankHistoryModal,
  gameHistoryPositions,
  openGamePositions,
  openRankHistoryModal,
  removeModalGameNotification,
  selectedRankHistoryPosition,
  selectedRegionCode,
  selectedVideoHistoryTargetPosition,
  selectedVideoId,
  selectedVideoRankHistoryVideoId,
  shouldLoadGame,
  userId,
}: UseHomeRankHistoryOptions) {
  const [rankHistoryFocusMode, setRankHistoryFocusMode] = useState<RankHistoryFocusMode>('full');
  const [selectedRankHistoryOwnerUserId, setSelectedRankHistoryOwnerUserId] = useState<number | null>(null);

  const openTradeRankHistory = useCallback(
    (videoId: string | undefined, position: GamePosition | null, ownerUserId: number | null = null) => {
      setSelectedRankHistoryOwnerUserId(ownerUserId);
      setRankHistoryFocusMode('trade');
      openRankHistoryModal(videoId, position);
    },
    [openRankHistoryModal],
  );

  const openFullRankHistory = useCallback(
    (videoId: string | undefined, position: GamePosition | null) => {
      setSelectedRankHistoryOwnerUserId(null);
      setRankHistoryFocusMode('full');
      openRankHistoryModal(videoId, position);
    },
    [openRankHistoryModal],
  );

  const isForeignSelectedRankHistory =
    selectedRankHistoryOwnerUserId !== null && selectedRankHistoryOwnerUserId !== userId;
  const {
    data: mySelectedPositionRankHistory,
    error: mySelectedPositionRankHistoryError,
    isLoading: isMyPositionRankHistoryLoading,
  } = useGamePositionRankHistory(
    accessToken,
    selectedRankHistoryPosition?.id ?? null,
    shouldLoadGame &&
      Boolean(selectedRankHistoryPosition) &&
      !isForeignSelectedRankHistory,
  );
  const {
    data: leaderboardSelectedPositionRankHistory,
    error: leaderboardSelectedPositionRankHistoryError,
    isLoading: isLeaderboardPositionRankHistoryLoading,
  } = useGameLeaderboardPositionRankHistory(
    accessToken,
    isForeignSelectedRankHistory ? selectedRankHistoryOwnerUserId : null,
    selectedRankHistoryPosition?.id ?? null,
    selectedRegionCode,
    shouldLoadGame && Boolean(selectedRankHistoryPosition) && isForeignSelectedRankHistory,
  );
  const selectedPositionRankHistory = isForeignSelectedRankHistory
    ? leaderboardSelectedPositionRankHistory
    : mySelectedPositionRankHistory;
  const selectedPositionRankHistoryError = isForeignSelectedRankHistory
    ? leaderboardSelectedPositionRankHistoryError
    : mySelectedPositionRankHistoryError;
  const isPositionRankHistoryLoading = isForeignSelectedRankHistory
    ? isLeaderboardPositionRankHistoryLoading
    : isMyPositionRankHistoryLoading;
  const relatedRankHistoryPositions = useMemo(
    () =>
      selectedRankHistoryPosition?.videoId
        ? gameHistoryPositions
            .filter((position) => position.videoId === selectedRankHistoryPosition.videoId)
            .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
        : [],
    [gameHistoryPositions, selectedRankHistoryPosition],
  );
  const relatedPositionRankHistoryQueries = useQueries({
    queries: relatedRankHistoryPositions.map((position) => ({
      enabled:
        shouldLoadGame &&
        Boolean(accessToken) &&
        Boolean(selectedRankHistoryPosition) &&
        !isForeignSelectedRankHistory &&
        position.id !== selectedRankHistoryPosition?.id,
      queryKey: gameQueryKeys.positionRankHistory(accessToken, position.id),
      queryFn: () => fetchGamePositionRankHistory(accessToken as string, position.id),
      staleTime: 1000 * 15,
    })),
  });
  const {
    data: selectedVideoRankHistory,
    error: selectedVideoRankHistoryError,
    isLoading: isVideoRankHistoryLoading,
  } = useVideoRankHistory(
    selectedRegionCode || VIDEO_GAME_REGION_CODE,
    selectedRankHistoryPosition?.videoId ?? selectedVideoRankHistoryVideoId ?? undefined,
    Boolean(selectedRankHistoryPosition?.videoId ?? selectedVideoRankHistoryVideoId),
  );

  const relatedPositionRankHistories = useMemo(
    () =>
      relatedPositionRankHistoryQueries
        .map((query) => query.data)
        .filter((history): history is GamePositionRankHistory => Boolean(history)),
    [relatedPositionRankHistoryQueries],
  );
  const relatedPositionRankHistoryError = relatedPositionRankHistoryQueries.find((query) => query.error)?.error;
  const isRelatedPositionRankHistoryLoading = relatedPositionRankHistoryQueries.some((query) => query.isLoading);
  const mergedRankHistory = useMemo(
    () =>
      mergeMultiplePositionHistories(
        selectedPositionRankHistory
          ? [selectedPositionRankHistory, ...relatedPositionRankHistories]
          : relatedPositionRankHistories,
        selectedVideoRankHistory,
      ),
    [relatedPositionRankHistories, selectedPositionRankHistory, selectedVideoRankHistory],
  );
  const visibleRankHistory = rankHistoryFocusMode === 'trade'
    ? selectedPositionRankHistory
    : mergedRankHistory;
  const visibleRankHistoryError =
    rankHistoryFocusMode === 'trade'
      ? selectedPositionRankHistoryError
      : selectedPositionRankHistoryError instanceof Error
        ? selectedPositionRankHistoryError
        : relatedPositionRankHistoryError instanceof Error
          ? relatedPositionRankHistoryError
          : selectedVideoRankHistoryError;
  const isVisibleRankHistoryLoading =
    rankHistoryFocusMode === 'trade'
      ? isPositionRankHistoryLoading
      : isPositionRankHistoryLoading || isRelatedPositionRankHistoryLoading || isVideoRankHistoryLoading;
  const isRankHistoryModalOpen = Boolean(selectedRankHistoryPosition || selectedVideoRankHistoryVideoId);

  const handleOpenGamePositionChart = useCallback(
    (position: GamePosition) => {
      openTradeRankHistory(position.videoId, position);
    },
    [openTradeRankHistory],
  );

  const handleOpenGameHistoryChart = useCallback(
    (position: GamePosition) => {
      openTradeRankHistory(position.videoId, position);
    },
    [openTradeRankHistory],
  );

  const handleOpenScheduledSellOrderChart = useCallback(
    (order: GameScheduledSellOrder) => {
      openTradeRankHistory(
        order.videoId,
        createScheduledSellOrderRankHistoryPosition(order),
      );
    },
    [openTradeRankHistory],
  );

  const handleSelectGameHighlight = useCallback(
    (highlight: GameHighlight) => {
      openTradeRankHistory(
        highlight.videoId,
        createHighlightRankHistoryPosition(highlight),
      );
    },
    [openTradeRankHistory],
  );

  const handleSelectLeaderboardHighlight = useCallback(
    (highlight: GameHighlight, ownerUserId: number | null) => {
      openTradeRankHistory(
        highlight.videoId,
        createHighlightRankHistoryPosition(highlight),
        ownerUserId,
      );
    },
    [openTradeRankHistory],
  );

  const handleSelectGameNotification = useCallback(
    (notification: GameNotification) => {
      const matchedPosition =
        openGamePositions.find((position) => position.id === notification.positionId) ??
        gameHistoryPositions.find((position) => position.id === notification.positionId) ??
        createRankHistoryPositionFromNotification(notification);

      openTradeRankHistory(notification.videoId ?? undefined, matchedPosition);
    },
    [gameHistoryPositions, openGamePositions, openTradeRankHistory],
  );

  const handleOpenGameNotificationChart = useCallback(
    (notification: GameNotification) => {
      const matchedPosition =
        openGamePositions.find((position) => position.id === notification.positionId) ??
        gameHistoryPositions.find((position) => position.id === notification.positionId) ??
        createRankHistoryPositionFromNotification(notification);

      openTradeRankHistory(notification.videoId ?? undefined, matchedPosition);
      removeModalGameNotification?.(notification.id);
    },
    [gameHistoryPositions, openGamePositions, openTradeRankHistory, removeModalGameNotification],
  );

  const handleOpenSelectedVideoRankHistory = useCallback(() => {
    openFullRankHistory(selectedVideoId, selectedVideoHistoryTargetPosition);
  }, [
    openFullRankHistory,
    selectedVideoHistoryTargetPosition,
    selectedVideoId,
  ]);

  const handleOpenVideoRankHistory = useCallback(
    (videoId: string) => {
      openFullRankHistory(videoId, null);
    },
    [openFullRankHistory],
  );

  const handleCloseRankHistory = useCallback(() => {
    setRankHistoryFocusMode('full');
    setSelectedRankHistoryOwnerUserId(null);
    closeRankHistoryModal();
  }, [closeRankHistoryModal]);

  return {
    handleCloseRankHistory,
    handleOpenGameHistoryChart,
    handleOpenGameNotificationChart,
    handleOpenGamePositionChart,
    handleOpenScheduledSellOrderChart,
    handleOpenSelectedVideoRankHistory,
    handleOpenVideoRankHistory,
    handleSelectGameHighlight,
    handleSelectGameNotification,
    handleSelectLeaderboardHighlight,
    isRankHistoryModalOpen,
    isVisibleRankHistoryLoading,
    rankHistoryFocusMode,
    visibleRankHistory,
    visibleRankHistoryError,
  };
}
