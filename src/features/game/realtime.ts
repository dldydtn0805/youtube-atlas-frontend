import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  subscribeToAuthenticatedRealtimeTopic,
  subscribeToRealtimeTopic,
} from '../realtime/stompClient';
import {
  applyGameWalletRealtimeUpdate,
  gameQueryKeys,
  refreshGameAccountState,
} from './queries';
import type { GameNotification, GameRealtimeEvent } from './types';

const GAME_TOPIC_PREFIX = '/topic/game';
const GAME_ACCOUNT_QUEUE = '/user/queue/game/account';
const GAME_NOTIFICATIONS_QUEUE = '/user/queue/game/notifications';
const ACCOUNT_UPDATED_EVENT = 'account-updated';
const MARKET_UPDATED_EVENT = 'market-updated';
const ACCOUNT_REFRESH_DELAY_MS = 180;

function toRealtimeEventKey(event: GameRealtimeEvent) {
  if (event.eventType === MARKET_UPDATED_EVENT) {
    return [event.eventType, event.regionCode, event.capturedAt ?? 'captured'].join(
      ':',
    );
  }

  return [event.eventType, event.regionCode, event.occurredAt ?? 'occurred'].join(':');
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

    let accountRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleAccountRefresh = () => {
      if (accountRefreshTimer) {
        clearTimeout(accountRefreshTimer);
      }

      accountRefreshTimer = setTimeout(() => {
        accountRefreshTimer = null;
        void refreshGameAccountState(queryClient, accessToken).catch(() => {
          // Keep the last confirmed cache when a background refresh fails.
        });
      }, ACCOUNT_REFRESH_DELAY_MS);
    };
    const unsubscribeAccount = subscribeToAuthenticatedRealtimeTopic(
      GAME_ACCOUNT_QUEUE,
      accessToken,
      (messageBody) => {
        try {
          const event = JSON.parse(messageBody) as GameRealtimeEvent;

          if (event.eventType !== ACCOUNT_UPDATED_EVENT) {
            return;
          }

          if (event.resource === 'wallet' && event.wallet) {
            applyGameWalletRealtimeUpdate(queryClient, accessToken, event.wallet);
          }

          if (event.resource === 'scheduled-orders') {
            void queryClient.invalidateQueries({
              queryKey: ['game', 'scheduledSellOrders', accessToken],
              refetchType: 'active',
            });
          }

          scheduleAccountRefresh();
        } catch {
          // Ignore malformed account messages so cached game state stays usable.
        }
      },
    );
    const unsubscribeMarket = subscribeToRealtimeTopic(
      `${GAME_TOPIC_PREFIX}/${regionCode}`,
      (messageBody) => {
        try {
          const event = JSON.parse(messageBody) as GameRealtimeEvent;

          if (event.eventType !== MARKET_UPDATED_EVENT || event.regionCode !== regionCode) {
            return;
          }

          const nextEventKey = toRealtimeEventKey(event);

          if (handledEventKeysRef.current.has(nextEventKey)) {
            return;
          }

          rememberEventKey(handledEventKeysRef.current, nextEventKey);
          void Promise.all([
            queryClient.invalidateQueries({
              queryKey: gameQueryKeys.market(accessToken, regionCode),
              refetchType: 'active',
            }),
            queryClient.invalidateQueries({
              queryKey: gameQueryKeys.buyableMarketChart(accessToken, regionCode),
              refetchType: 'active',
            }),
          ]);
          scheduleAccountRefresh();
        } catch {
          // Ignore malformed market messages so cached game state stays usable.
        }
      },
    );

    return () => {
      if (accountRefreshTimer) {
        clearTimeout(accountRefreshTimer);
      }
      unsubscribeAccount();
      unsubscribeMarket();
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
          void Promise.all([
            queryClient.invalidateQueries({
              queryKey: ['game', 'notifications', accessToken],
              refetchType: 'active',
            }),
            queryClient.invalidateQueries({
              queryKey: ['game', 'highlights', accessToken],
              refetchType: 'active',
            }),
            queryClient.invalidateQueries({
              queryKey: gameQueryKeys.achievementTitles(accessToken),
              refetchType: 'active',
            }),
          ]);
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
