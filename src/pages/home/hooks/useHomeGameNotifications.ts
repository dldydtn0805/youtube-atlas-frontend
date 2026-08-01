import { useCallback, useEffect, useMemo, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import {
  invalidateGameQueries,
  useDeleteGameNotification,
  useDeleteGameNotifications,
  useGameNotifications,
  useMarkGameNotificationsRead,
} from '../../../features/game/queries';
import type { GameNotification } from '../../../features/game/types';
import { logRealtimeGameNotificationDebug, mergeGameNotifications } from '../homeGameNotifications';
import { shouldOpenGameNotificationModal } from '../sections/gameNotificationModalUtils';
import { enqueueGameNotification, removeGameNotification } from '../sections/gameNotificationQueueUtils';
import { useGameNotificationRealtime } from '../../../features/game/realtime';

type GameNotificationType =
  | 'ATLAS_SHOT'
  | 'GALAXY_SHOT'
  | 'SOLAR_SHOT'
  | 'MOONSHOT'
  | 'SMALL_CASHOUT'
  | 'BIG_CASHOUT'
  | 'SNIPE'
  | 'TIER_PROMOTION'
  | 'TITLE_UNLOCK';

type GameNotificationEventType =
  | 'PROJECTED_HIGHLIGHT'
  | 'TIER_SCORE_GAIN'
  | 'TIER_PROMOTION'
  | 'TITLE_UNLOCK';

interface GameNotificationTestPayload {
  id?: string;
  notificationEventType?: GameNotificationEventType;
  notificationType?: GameNotificationType;
  title?: string;
  message?: string;
  positionId?: number | null;
  videoId?: string | null;
  videoTitle?: string | null;
  channelTitle?: string | null;
  thumbnailUrl?: string | null;
  strategyTags?: Array<'ATLAS_SHOT' | 'GALAXY_SHOT' | 'SOLAR_SHOT' | 'MOONSHOT' | 'SMALL_CASHOUT' | 'BIG_CASHOUT' | 'SNIPE'>;
  highlightScore?: number | null;
  titleCode?: string | null;
  titleDisplayName?: string | null;
  titleGrade?: 'NORMAL' | 'RARE' | 'SUPER' | 'ULTIMATE' | null;
  readAt?: string | null;
  createdAt?: string;
  showModal?: boolean;
}

interface UseHomeGameNotificationsOptions {
  accessToken: string | null;
  queryClient: QueryClient;
  resetKey: number | null | undefined;
  seasonNotifications?: GameNotification[];
  selectedRegionCode: string;
  shouldLoadGame: boolean;
}

export default function useHomeGameNotifications({
  accessToken,
  queryClient,
  resetKey,
  seasonNotifications,
  selectedRegionCode,
  shouldLoadGame,
}: UseHomeGameNotificationsOptions) {
  const [pushedGameNotifications, setPushedGameNotifications] = useState<GameNotification[]>([]);
  const [modalGameNotificationQueue, setModalGameNotificationQueue] = useState<GameNotification[]>([]);
  const [visibleGameNotificationQueue, setVisibleGameNotificationQueue] = useState<GameNotification[]>([]);

  const modalGameNotification = modalGameNotificationQueue[0] ?? null;
  const visibleGameNotification = visibleGameNotificationQueue[0] ?? null;
  const {
    data: fetchedGameNotifications = [],
    isFetching: isGameNotificationsFetching,
    refetch: refetchGameNotifications,
  } = useGameNotifications(accessToken, selectedRegionCode, false);
  const markGameNotificationsReadMutation = useMarkGameNotificationsRead(accessToken, selectedRegionCode);
  const deleteGameNotificationsMutation = useDeleteGameNotifications(accessToken, selectedRegionCode);
  const deleteGameNotificationMutation = useDeleteGameNotification(accessToken, selectedRegionCode);

  const handleRealtimeGameNotification = useCallback((notification: GameNotification) => {
    setPushedGameNotifications((currentNotifications) => {
      logRealtimeGameNotificationDebug(notification, currentNotifications);
      return mergeGameNotifications([notification], currentNotifications);
    });
    setVisibleGameNotificationQueue((currentQueue) =>
      enqueueGameNotification(currentQueue, notification));

    if (shouldOpenGameNotificationModal(notification)) {
      setModalGameNotificationQueue((currentQueue) =>
        enqueueGameNotification(currentQueue, notification));
    }
  }, []);

  useGameNotificationRealtime(
    accessToken,
    selectedRegionCode,
    handleRealtimeGameNotification,
    shouldLoadGame,
  );

  useEffect(() => {
    setPushedGameNotifications([]);
    setModalGameNotificationQueue([]);
    setVisibleGameNotificationQueue([]);
  }, [resetKey]);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return;
    }

    const emitGameNotificationTest = (notification?: GameNotificationTestPayload) => {
      const now = new Date().toISOString();
      const notificationType = notification?.notificationType ?? 'MOONSHOT';
      const notificationEventType = notification?.notificationEventType
        ?? (notificationType === 'TIER_PROMOTION'
          ? 'TIER_PROMOTION'
          : notificationType === 'TITLE_UNLOCK'
            ? 'TITLE_UNLOCK'
            : notification?.showModal === false
              ? 'PROJECTED_HIGHLIGHT'
              : 'TIER_SCORE_GAIN');

      handleRealtimeGameNotification({
        id: notification?.id ?? `game-test-${Date.now()}-${notificationType}`,
        notificationEventType,
        notificationType,
        title: notification?.title ?? (notificationType === 'TITLE_UNLOCK' ? '새 칭호 획득' : '문샷 적중'),
        message: notification?.message ?? (notificationType === 'TITLE_UNLOCK' ? 'Atlas Seeker 칭호를 획득했습니다.' : '테스트 소켓 알림입니다.'),
        positionId: notification?.positionId ?? (notificationType === 'TITLE_UNLOCK' ? null : 999_999),
        videoId: notification?.videoId ?? (notificationType === 'TITLE_UNLOCK' ? null : 'test-video'),
        videoTitle: notification?.videoTitle ?? (notificationType === 'TITLE_UNLOCK' ? null : '콘솔 테스트 영상'),
        channelTitle: notification?.channelTitle ?? (notificationType === 'TITLE_UNLOCK' ? null : '테스트 채널'),
        thumbnailUrl: notification?.thumbnailUrl ?? (notificationType === 'TITLE_UNLOCK'
          ? null
          : 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'),
        strategyTags: notification?.strategyTags ?? (notificationType === 'TIER_PROMOTION' || notificationType === 'TITLE_UNLOCK'
          ? []
          : [notificationType]),
        highlightScore: notification?.highlightScore ?? (notificationType === 'TITLE_UNLOCK' ? null : 12_345),
        titleCode: notification?.titleCode ?? (notificationType === 'TITLE_UNLOCK' ? 'ATLAS_SEEKER' : null),
        titleDisplayName: notification?.titleDisplayName ?? (notificationType === 'TITLE_UNLOCK' ? 'Atlas Seeker' : null),
        titleGrade: notification?.titleGrade ?? (notificationType === 'TITLE_UNLOCK' ? 'NORMAL' : null),
        readAt: notification?.readAt ?? null,
        createdAt: notification?.createdAt ?? now,
        showModal: notification?.showModal ?? (notificationType === 'TITLE_UNLOCK' ? false : true),
      });
    };

    window.__emitGameRealtimeTest = (event) => {
      const regionCode = event?.regionCode ?? selectedRegionCode;

      void invalidateGameQueries(queryClient, {
        accessToken,
        includeLeaderboardPositions: true,
        regionCode,
      });
    };
    window.__emitGameNotificationTest = emitGameNotificationTest;
    window.__emitToastOnlyGameNotificationTest = () => {
      emitGameNotificationTest({
        message: '토스트 전용 하이라이트 포착 테스트입니다.',
        notificationEventType: 'PROJECTED_HIGHLIGHT',
        notificationType: 'MOONSHOT',
        showModal: false,
        title: '하이라이트 포착',
      });
    };
    window.__emitModalGameNotificationTest = (kind = 'tier-score') => {
      if (kind === 'tier-promotion') {
        emitGameNotificationTest({
          message: '티어 승급 모달 테스트입니다.',
          notificationEventType: 'TIER_PROMOTION',
          notificationType: 'TIER_PROMOTION',
          showModal: false,
          strategyTags: [],
          title: '티어 승급',
        });
        return;
      }

      emitGameNotificationTest({
        message: '하이라이트 기록 모달 테스트입니다.',
        notificationEventType: 'TIER_SCORE_GAIN',
        notificationType: 'MOONSHOT',
        showModal: false,
        title: '하이라이트 기록',
      });
    };

    return () => {
      delete window.__emitGameRealtimeTest;
      delete window.__emitGameNotificationTest;
      delete window.__emitToastOnlyGameNotificationTest;
      delete window.__emitModalGameNotificationTest;
    };
  }, [accessToken, handleRealtimeGameNotification, queryClient, selectedRegionCode]);

  const gameNotifications = useMemo(
    () => mergeGameNotifications(
      pushedGameNotifications,
      fetchedGameNotifications,
      seasonNotifications,
    ),
    [fetchedGameNotifications, pushedGameNotifications, seasonNotifications],
  );

  const clearGameNotifications = useCallback(async () => {
    if (!accessToken || gameNotifications.length === 0) {
      return;
    }

    const previousPushedNotifications = pushedGameNotifications;
    const previousModalNotificationQueue = modalGameNotificationQueue;
    const previousVisibleNotificationQueue = visibleGameNotificationQueue;
    setPushedGameNotifications([]);
    setModalGameNotificationQueue([]);
    setVisibleGameNotificationQueue([]);

    try {
      await deleteGameNotificationsMutation.mutateAsync();
    } catch (error) {
      setPushedGameNotifications(previousPushedNotifications);
      setModalGameNotificationQueue(previousModalNotificationQueue);
      setVisibleGameNotificationQueue(previousVisibleNotificationQueue);
      throw error;
    }
  }, [
    accessToken,
    deleteGameNotificationsMutation,
    gameNotifications.length,
    modalGameNotificationQueue,
    pushedGameNotifications,
    visibleGameNotificationQueue,
  ]);

  const deleteGameNotification = useCallback(async (notificationId: string) => {
    if (!accessToken) {
      return;
    }

    const previousPushedNotifications = pushedGameNotifications;
    const previousModalNotificationQueue = modalGameNotificationQueue;
    const previousVisibleNotificationQueue = visibleGameNotificationQueue;
    setPushedGameNotifications((notifications) =>
      notifications.filter((notification) => notification.id !== notificationId));
    setModalGameNotificationQueue((notifications) =>
      removeGameNotification(notifications, notificationId));
    setVisibleGameNotificationQueue((notifications) =>
      removeGameNotification(notifications, notificationId));

    try {
      await deleteGameNotificationMutation.mutateAsync(notificationId);
    } catch (error) {
      setPushedGameNotifications(previousPushedNotifications);
      setModalGameNotificationQueue(previousModalNotificationQueue);
      setVisibleGameNotificationQueue(previousVisibleNotificationQueue);
      throw error;
    }
  }, [
    accessToken,
    deleteGameNotificationMutation,
    modalGameNotificationQueue,
    pushedGameNotifications,
    visibleGameNotificationQueue,
  ]);

  const refreshGameNotifications = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    await refetchGameNotifications();
    setPushedGameNotifications([]);
    setModalGameNotificationQueue([]);
    setVisibleGameNotificationQueue([]);

    void markGameNotificationsReadMutation.mutateAsync().catch(() => {
      // The notification list should remain usable even if read marking fails.
    });
  }, [
    accessToken,
    markGameNotificationsReadMutation,
    refetchGameNotifications,
  ]);

  const dismissVisibleGameNotification = useCallback(() => {
    setVisibleGameNotificationQueue((notifications) =>
      visibleGameNotification
        ? removeGameNotification(notifications, visibleGameNotification.id)
        : notifications);
  }, [visibleGameNotification]);

  const dismissModalGameNotification = useCallback(() => {
    setModalGameNotificationQueue((notifications) =>
      modalGameNotification
        ? removeGameNotification(notifications, modalGameNotification.id)
        : notifications);
  }, [modalGameNotification]);

  const removeModalGameNotification = useCallback((notificationId: string) => {
    setModalGameNotificationQueue((notifications) =>
      removeGameNotification(notifications, notificationId));
  }, []);

  const hasUnreadGameNotifications = gameNotifications.some(
    (notification) => !notification.readAt,
  );

  return {
    clearGameNotifications,
    deleteGameNotification,
    dismissModalGameNotification,
    dismissVisibleGameNotification,
    gameNotifications,
    hasUnreadGameNotifications,
    isGameNotificationsFetching,
    modalGameNotification,
    removeModalGameNotification,
    refreshGameNotifications,
    visibleGameNotification,
  };
}
