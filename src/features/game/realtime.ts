import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { VIDEO_FILTER_REGION_CODES } from '../../constants/videoCategories';
import {
  subscribeToAuthenticatedRealtimeTopic,
  subscribeToRealtimeTopic,
} from '../realtime/stompClient';
import { invalidateGameQueries } from './queries';
import type { GameNotification, GameRealtimeEvent } from './types';

const GAME_TOPIC_PREFIX = '/topic/game';
const GAME_NOTIFICATIONS_QUEUE = '/user/queue/game/notifications';
const WALLET_UPDATED_EVENT = 'wallet-updated';
const MARKET_UPDATED_EVENT = 'market-updated';

function toRealtimeEventKey(event: GameRealtimeEvent) {
  if (event.eventType === MARKET_UPDATED_EVENT) {
    return [event.eventType, event.regionCode, event.capturedAt ?? 'captured'].join(
      ':',
    );
  }

  return [
    event.eventType,
    event.regionCode,
    event.seasonId ?? 'season',
    event.capturedAt ?? 'captured',
    event.occurredAt ?? 'occurred',
  ].join(':');
}

function rememberEventKey(keys: Set<string>, eventKey: string) {
  keys.add(eventKey);

  if (keys.size <= 50) {
    return;
  }

  const oldestKey = keys.values().next().value;
  if (oldestKey) {
    keys.delete(oldestKey);
  }
}

export function useGameRealtimeInvalidation(
  accessToken: string | null,
  regionCode: string | null,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const handledEventKeysRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || !accessToken || !regionCode) {
      handledEventKeysRef.current.clear();
      return;
    }

    const unsubscribes = VIDEO_FILTER_REGION_CODES.map((gameRegionCode) =>
      subscribeToRealtimeTopic(`${GAME_TOPIC_PREFIX}/${gameRegionCode}`, (messageBody) => {
        try {
          const event = JSON.parse(messageBody) as GameRealtimeEvent;

          if (
            (event.eventType !== WALLET_UPDATED_EVENT &&
              event.eventType !== MARKET_UPDATED_EVENT) ||
            event.regionCode !== gameRegionCode
          ) {
            return;
          }

          const nextEventKey = toRealtimeEventKey(event);

          if (handledEventKeysRef.current.has(nextEventKey)) {
            return;
          }

          rememberEventKey(handledEventKeysRef.current, nextEventKey);

          void invalidateGameQueries(queryClient, {
            accessToken,
            includeLeaderboardPositions: true,
            regionCode: gameRegionCode,
          });
        } catch {
          // Ignore malformed realtime messages so game queries keep working.
        }
      }),
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
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
          void invalidateGameQueries(queryClient, {
            accessToken,
            includeLeaderboardPositions: true,
            regionCode: regionCode ?? null,
          });
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
