import { useEffect, useRef } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';
import { useQueryClient } from '@tanstack/react-query';
import { getWebSocketUrl } from '../../lib/api';
import { invalidateGameQueries } from './queries';
import type { GameRealtimeEvent } from './types';

const GAME_TOPIC_PREFIX = '/topic/game';
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

    let isDisposed = false;
    let subscription: StompSubscription | undefined;
    const client = new Client({
      brokerURL: getWebSocketUrl(),
      debug: () => {},
      reconnectDelay: 5_000,
    });

    client.onConnect = () => {
      if (isDisposed) {
        void client.deactivate();
        return;
      }

      subscription = client.subscribe(`${GAME_TOPIC_PREFIX}/${regionCode}`, (message) => {
        try {
          const event = JSON.parse(message.body) as GameRealtimeEvent;

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
    };

    client.activate();

    return () => {
      isDisposed = true;
      subscription?.unsubscribe();
      void client.deactivate();
    };
  }, [accessToken, enabled, queryClient, regionCode]);
}
