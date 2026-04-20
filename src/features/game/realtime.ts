import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  subscribeToAuthenticatedRealtimeTopic,
  subscribeToRealtimeTopic,
} from '../realtime/stompClient';
import { gameQueryKeys, invalidateGameQueries } from './queries';
import type { GameNotification, GameRealtimeEvent } from './types';

const GAME_TOPIC_PREFIX = '/topic/game';
const GAME_NOTIFICATIONS_QUEUE = '/user/queue/game/notifications';
const WALLET_UPDATED_EVENT = 'wallet-updated';

function toRealtimeEventKey(event: GameRealtimeEvent) {
  return [
    event.eventType,
    event.regionCode,
    event.seasonId ?? 'season',
    event.capturedAt ?? 'captured',
    event.occurredAt ?? 'occurred',
  ].join(':');
}

export function useGameRealtimeInvalidation(
  accessToken: string | null,
  regionCode: string | null,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const handledEventKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !accessToken || !regionCode) {
      handledEventKeyRef.current = null;
      return;
    }

    const unsubscribe = subscribeToRealtimeTopic(`${GAME_TOPIC_PREFIX}/${regionCode}`, (messageBody) => {
      try {
        const event = JSON.parse(messageBody) as GameRealtimeEvent;

        if (event.eventType !== WALLET_UPDATED_EVENT || event.regionCode !== regionCode) {
          return;
        }

        const nextEventKey = toRealtimeEventKey(event);

        if (handledEventKeyRef.current === nextEventKey) {
          return;
        }

        handledEventKeyRef.current = nextEventKey;

        void invalidateGameQueries(queryClient, {
          accessToken,
          includeLeaderboardPositions: true,
          regionCode,
          seasonId: event.seasonId,
        });
      } catch {
        // Ignore malformed realtime messages so game queries keep working.
      }
    });

    return () => {
      unsubscribe();
    };
  }, [accessToken, enabled, queryClient, regionCode]);
}

export function useGameNotificationRealtime(
  accessToken: string | null,
  regionCode: string | null,
  onNotification: (notification: GameNotification) => void,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const notificationHandlerRef = useRef(onNotification);

  useEffect(() => {
    notificationHandlerRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!enabled || !accessToken) {
      return;
    }

    const unsubscribe = subscribeToAuthenticatedRealtimeTopic(
      GAME_NOTIFICATIONS_QUEUE,
      accessToken,
      (messageBody) => {
        try {
          const notification = JSON.parse(messageBody) as GameNotification;
          notificationHandlerRef.current(notification);

          if (regionCode) {
            void queryClient.invalidateQueries({
              queryKey: gameQueryKeys.notifications(accessToken, regionCode),
              refetchType: 'active',
            });
          }
        } catch {
          // Ignore malformed notification messages.
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [accessToken, enabled, queryClient, regionCode]);
}
