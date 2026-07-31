import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const topicHandlers = new Map<string, Set<(message: string) => void>>();
const invalidateGameQueriesMock = vi.fn();

vi.mock('../realtime/stompClient', () => ({
  resetSharedRealtimeClientForTests: vi.fn(() => topicHandlers.clear()),
  subscribeToRealtimeConnection: vi.fn(() => () => {}),
  subscribeToAuthenticatedRealtimeTopic: vi.fn(
    (topic: string, _accessToken: string, handler: (message: string) => void) => {
      const handlers = topicHandlers.get(topic) ?? new Set();
      handlers.add(handler);
      topicHandlers.set(topic, handlers);
      return () => handlers.delete(handler);
    },
  ),
  subscribeToRealtimeTopic: vi.fn((topic: string, handler: (message: string) => void) => {
    const handlers = topicHandlers.get(topic) ?? new Set();
    handlers.add(handler);
    topicHandlers.set(topic, handlers);
    return () => handlers.delete(handler);
  }),
}));

vi.mock('./queries', async () => {
  const actual = await vi.importActual<typeof import('./queries')>('./queries');

  return {
    ...actual,
    invalidateGameQueries: invalidateGameQueriesMock,
  };
});

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function emitTopic(topic: string, payload: unknown) {
  topicHandlers.get(topic)?.forEach((handler) => handler(JSON.stringify(payload)));
}

describe('game realtime', () => {
  afterEach(() => {
    topicHandlers.clear();
    invalidateGameQueriesMock.mockReset();
  });

  it('invalidates game queries when a wallet update arrives from Supabase Realtime', async () => {
    const { useGameRealtimeInvalidation } = await import('./realtime');
    const queryClient = new QueryClient();

    function HookHarness() {
      useGameRealtimeInvalidation('token-1', 'KR');
      return null;
    }

    render(<HookHarness />, {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      emitTopic('/topic/game/KR', {
        capturedAt: '2026-04-11T10:00:00Z',
        eventType: 'wallet-updated',
        occurredAt: '2026-04-11T10:00:01Z',
        regionCode: 'KR',
        seasonId: 12,
      });
    });

    expect(invalidateGameQueriesMock).toHaveBeenCalledWith(queryClient, {
      accessToken: 'token-1',
      includeLeaderboardPositions: true,
      regionCode: 'KR',
    });
  });

  it('coalesces only exact duplicate wallet updates', async () => {
    const { useGameRealtimeInvalidation } = await import('./realtime');

    function HookHarness() {
      useGameRealtimeInvalidation('token-1', 'KR');
      return null;
    }

    render(<HookHarness />, {
      wrapper: createWrapper(new QueryClient()),
    });

    const event = {
      capturedAt: '2026-04-11T10:00:00Z',
      eventType: 'wallet-updated',
      occurredAt: '2026-04-11T10:00:01Z',
      regionCode: 'KR',
      seasonId: 12,
    };

    act(() => {
      emitTopic('/topic/game/KR', event);
      emitTopic('/topic/game/KR', event);
    });

    expect(invalidateGameQueriesMock).toHaveBeenCalledTimes(1);
  });

  it('does not coalesce distinct wallet updates', async () => {
    const { useGameRealtimeInvalidation } = await import('./realtime');

    function HookHarness() {
      useGameRealtimeInvalidation('token-1', 'KR');
      return null;
    }

    render(<HookHarness />, {
      wrapper: createWrapper(new QueryClient()),
    });

    act(() => {
      emitTopic('/topic/game/KR', {
        capturedAt: '2026-04-11T10:00:00Z',
        eventType: 'wallet-updated',
        occurredAt: '2026-04-11T10:00:01Z',
        regionCode: 'KR',
        seasonId: 12,
      });
      emitTopic('/topic/game/KR', {
        capturedAt: '2026-04-11T10:00:00Z',
        eventType: 'wallet-updated',
        occurredAt: '2026-04-11T10:05:01Z',
        regionCode: 'KR',
        seasonId: 12,
      });
    });

    expect(invalidateGameQueriesMock).toHaveBeenCalledTimes(2);
  });

  it('invalidates game queries when a personal notification arrives', async () => {
    const { useGameNotificationRealtime } = await import('./realtime');
    const queryClient = new QueryClient();
    const onNotification = vi.fn();

    function HookHarness() {
      useGameNotificationRealtime('token-1', 'KR', onNotification);
      return null;
    }

    render(<HookHarness />, {
      wrapper: createWrapper(queryClient),
    });

    const notification = {
      channelTitle: 'Channel',
      createdAt: '2026-04-11T10:00:01Z',
      highlightScore: 40000,
      id: 'notification-1',
      message: '예약 매도가 실행되었습니다.',
      notificationEventType: 'PROJECTED_HIGHLIGHT',
      notificationType: 'SMALL_CASHOUT',
      positionId: 300,
      readAt: null,
      strategyTags: [],
      thumbnailUrl: null,
      title: '예약 매도 체결',
      videoId: 'video-1',
      videoTitle: 'Video',
    };

    act(() => {
      emitTopic('/user/queue/game/notifications', notification);
    });

    expect(onNotification).toHaveBeenCalledWith(notification);
    expect(invalidateGameQueriesMock).toHaveBeenCalledWith(queryClient, {
      accessToken: 'token-1',
      includeLeaderboardPositions: true,
      regionCode: 'KR',
    });
  });

  it('subscribes comments and game hooks to separate Supabase channels', async () => {
    const { useComments } = await import('../comments/queries');
    const { useGameRealtimeInvalidation } = await import('./realtime');

    function HookHarness() {
      useComments(undefined);
      useGameRealtimeInvalidation('token-1', 'KR');
      return null;
    }

    render(<HookHarness />, {
      wrapper: createWrapper(new QueryClient()),
    });

    expect(topicHandlers.has('/topic/comments')).toBe(true);
    expect(topicHandlers.has('/topic/comments/presence')).toBe(true);
    expect(topicHandlers.has('/topic/game/KR')).toBe(true);
  });
});
