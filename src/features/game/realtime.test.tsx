import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const topicHandlers = new Map<string, Set<(message: string) => void>>();
const applyGameWalletRealtimeUpdateMock = vi.fn();
const refreshGameAccountStateMock = vi.fn().mockResolvedValue(null);

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
    applyGameWalletRealtimeUpdate: applyGameWalletRealtimeUpdateMock,
    refreshGameAccountState: refreshGameAccountStateMock,
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
    applyGameWalletRealtimeUpdateMock.mockReset();
    refreshGameAccountStateMock.mockReset().mockResolvedValue(null);
    vi.useRealTimers();
  });

  it('subscribes only to the active market and one personal account channel', async () => {
    const { useGameRealtimeInvalidation } = await import('./realtime');

    function HookHarness() {
      useGameRealtimeInvalidation('token-1', 'KR');
      return null;
    }

    render(<HookHarness />, {
      wrapper: createWrapper(new QueryClient()),
    });

    expect(topicHandlers.has('/topic/game/KR')).toBe(true);
    expect(topicHandlers.has('/topic/game/US')).toBe(false);
    expect(topicHandlers.has('/user/queue/game/account')).toBe(true);
  });

  it('patches wallet points immediately and refreshes authoritative account state once', async () => {
    vi.useFakeTimers();
    const { useGameRealtimeInvalidation } = await import('./realtime');
    const queryClient = new QueryClient();
    const wallet = {
      balancePoints: 12000,
      realizedPnlPoints: 2000,
      reservedPoints: 0,
      seasonId: 12,
    };

    function HookHarness() {
      useGameRealtimeInvalidation('token-1', 'KR');
      return null;
    }

    render(<HookHarness />, { wrapper: createWrapper(queryClient) });

    act(() => {
      emitTopic('/user/queue/game/account', {
        eventType: 'account-updated',
        occurredAt: '2026-04-11T10:00:01Z',
        regionCode: 'GLOBAL',
        resource: 'wallet',
        seasonId: 12,
        wallet,
      });
    });

    expect(applyGameWalletRealtimeUpdateMock).toHaveBeenCalledWith(
      queryClient,
      'token-1',
      wallet,
    );
    expect(refreshGameAccountStateMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180);
    });

    expect(refreshGameAccountStateMock).toHaveBeenCalledTimes(1);
    expect(refreshGameAccountStateMock).toHaveBeenCalledWith(queryClient, 'token-1');
  });

  it('coalesces wallet, position, and scheduled-order events from one transaction', async () => {
    vi.useFakeTimers();
    const { useGameRealtimeInvalidation } = await import('./realtime');

    function HookHarness() {
      useGameRealtimeInvalidation('token-1', 'KR');
      return null;
    }

    render(<HookHarness />, { wrapper: createWrapper(new QueryClient()) });

    act(() => {
      emitTopic('/user/queue/game/account', {
        eventType: 'account-updated',
        regionCode: 'GLOBAL',
        resource: 'wallet',
        wallet: { balancePoints: 12000 },
      });
      emitTopic('/user/queue/game/account', {
        eventType: 'account-updated',
        regionCode: 'KR',
        resource: 'positions',
      });
      emitTopic('/user/queue/game/account', {
        eventType: 'account-updated',
        regionCode: 'KR',
        resource: 'scheduled-orders',
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(179);
    });
    expect(refreshGameAccountStateMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(refreshGameAccountStateMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes only market data and account valuation after a completed market sync', async () => {
    vi.useFakeTimers();
    const { useGameRealtimeInvalidation } = await import('./realtime');
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    function HookHarness() {
      useGameRealtimeInvalidation('token-1', 'KR');
      return null;
    }

    render(<HookHarness />, { wrapper: createWrapper(queryClient) });

    const event = {
      capturedAt: '2026-04-11T11:00:00Z',
      eventType: 'market-updated',
      occurredAt: '2026-04-11T11:05:00Z',
      regionCode: 'KR',
      seasonId: null,
    };
    act(() => {
      emitTopic('/topic/game/KR', event);
      emitTopic('/topic/game/KR', event);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['game', 'market', 'token-1', 'KR'],
      refetchType: 'active',
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['game', 'buyableMarketChart', 'token-1', 'KR'],
      refetchType: 'active',
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180);
    });
    expect(refreshGameAccountStateMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes only notification-related caches for a personal notification', async () => {
    const { useGameNotificationRealtime } = await import('./realtime');
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const onNotification = vi.fn();

    function HookHarness() {
      useGameNotificationRealtime('token-1', 'KR', onNotification);
      return null;
    }

    render(<HookHarness />, { wrapper: createWrapper(queryClient) });

    const notification = {
      id: 'notification-1',
      message: '예약 매도가 실행되었습니다.',
      title: '예약 매도 체결',
    };
    act(() => {
      emitTopic('/user/queue/game/notifications', notification);
    });

    expect(onNotification).toHaveBeenCalledWith(notification);
    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(3);
  });

  it('keeps comments and game subscriptions on separate channels', async () => {
    const { useComments } = await import('../comments/queries');
    const { useGameRealtimeInvalidation } = await import('./realtime');

    function HookHarness() {
      useComments(undefined);
      useGameRealtimeInvalidation('token-1', 'KR');
      return null;
    }

    render(<HookHarness />, { wrapper: createWrapper(new QueryClient()) });

    expect(topicHandlers.has('/topic/comments')).toBe(true);
    expect(topicHandlers.has('/topic/comments/presence')).toBe(true);
    expect(topicHandlers.has('/topic/game/KR')).toBe(true);
    expect(topicHandlers.has('/user/queue/game/account')).toBe(true);
  });
});
