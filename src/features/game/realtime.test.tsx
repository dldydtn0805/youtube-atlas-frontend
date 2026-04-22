import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const clientInstances: MockClient[] = [];
const invalidateGameQueriesMock = vi.fn();

class MockClient {
  brokerURL?: string;
  debug?: () => void;
  reconnectDelay?: number;
  onConnect?: () => void;
  subscribe = vi.fn(() => ({
    unsubscribe: vi.fn(),
  }));
  activate = vi.fn();
  deactivate = vi.fn(async () => {});

  constructor(config: { brokerURL: string; debug: () => void; reconnectDelay: number }) {
    this.brokerURL = config.brokerURL;
    this.debug = config.debug;
    this.reconnectDelay = config.reconnectDelay;
    clientInstances.push(this);
  }
}

vi.mock('@stomp/stompjs', () => ({
  Client: MockClient,
}));

vi.mock('../../lib/api', () => ({
  getWebSocketUrl: () => 'ws://example.com/ws',
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

describe('game realtime', () => {
  afterEach(async () => {
    clientInstances.length = 0;
    invalidateGameQueriesMock.mockReset();
    const { resetSharedRealtimeClientForTests } = await import('../realtime/stompClient');
    resetSharedRealtimeClientForTests();
  });

  it('invalidates game queries when a wallet update event arrives for the current region', async () => {
    const { useGameRealtimeInvalidation } = await import('./realtime');

    function HookHarness() {
      useGameRealtimeInvalidation('token-1', 'KR');
      return null;
    }

    const queryClient = new QueryClient();

    render(<HookHarness />, {
      wrapper: createWrapper(queryClient),
    });

    const client = clientInstances.at(-1);
    expect(client).toBeDefined();

    client?.onConnect?.();
    const callback = client?.subscribe.mock.calls.at(0)?.at(1) as
      | ((message: { body: string }) => void)
      | undefined;

    callback?.({
      body: JSON.stringify({
        eventType: 'wallet-updated',
        regionCode: 'KR',
        seasonId: 12,
        capturedAt: '2026-04-11T10:00:00Z',
        occurredAt: '2026-04-11T10:00:01Z',
      }),
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

    const queryClient = new QueryClient();

    render(<HookHarness />, {
      wrapper: createWrapper(queryClient),
    });

    const client = clientInstances.at(-1);
    client?.onConnect?.();
    const callback = client?.subscribe.mock.calls.at(0)?.at(1) as
      | ((message: { body: string }) => void)
      | undefined;

    callback?.({
      body: JSON.stringify({
        eventType: 'wallet-updated',
        regionCode: 'KR',
        seasonId: 12,
        capturedAt: '2026-04-11T10:00:00Z',
        occurredAt: '2026-04-11T10:00:01Z',
      }),
    });
    callback?.({
      body: JSON.stringify({
        eventType: 'wallet-updated',
        regionCode: 'KR',
        seasonId: 12,
        capturedAt: '2026-04-11T10:00:00Z',
        occurredAt: '2026-04-11T10:00:01Z',
      }),
    });

    expect(invalidateGameQueriesMock).toHaveBeenCalledTimes(1);
  });

  it('does not coalesce distinct wallet updates within the same capture slot', async () => {
    const { useGameRealtimeInvalidation } = await import('./realtime');

    function HookHarness() {
      useGameRealtimeInvalidation('token-1', 'KR');
      return null;
    }

    const queryClient = new QueryClient();

    render(<HookHarness />, {
      wrapper: createWrapper(queryClient),
    });

    const client = clientInstances.at(-1);
    client?.onConnect?.();
    const callback = client?.subscribe.mock.calls.at(0)?.at(1) as
      | ((message: { body: string }) => void)
      | undefined;

    callback?.({
      body: JSON.stringify({
        eventType: 'wallet-updated',
        regionCode: 'KR',
        seasonId: 12,
        capturedAt: '2026-04-11T10:00:00Z',
        occurredAt: '2026-04-11T10:00:01Z',
      }),
    });
    callback?.({
      body: JSON.stringify({
        eventType: 'wallet-updated',
        regionCode: 'KR',
        seasonId: 12,
        capturedAt: '2026-04-11T10:00:00Z',
        occurredAt: '2026-04-11T10:05:01Z',
      }),
    });

    expect(invalidateGameQueriesMock).toHaveBeenCalledTimes(2);
  });

  it('invalidates game queries when an authenticated game notification arrives', async () => {
    const { useGameNotificationRealtime } = await import('./realtime');

    function HookHarness() {
      useGameNotificationRealtime('token-1', 'KR', vi.fn());
      return null;
    }

    const queryClient = new QueryClient();

    render(<HookHarness />, {
      wrapper: createWrapper(queryClient),
    });

    const client = clientInstances.at(-1);
    expect(client).toBeDefined();

    client?.onConnect?.();
    const callback = client?.subscribe.mock.calls.at(0)?.at(1) as
      | ((message: { body: string }) => void)
      | undefined;

    callback?.({
      body: JSON.stringify({
        id: 'tier-promotion-1-DIAMOND',
        notificationEventType: 'TIER_PROMOTION',
        notificationType: 'TIER_PROMOTION',
        title: '티어 승급',
        message: '다이아몬드 티어에 도달했습니다. 축하합니다!',
        positionId: 300,
        videoId: 'video-1',
        videoTitle: '다이아몬드 티어 달성',
        channelTitle: 'Channel',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        strategyTags: [],
        highlightScore: 40000,
        readAt: null,
        createdAt: '2026-04-11T10:00:01Z',
        showModal: true,
      }),
    });

    expect(invalidateGameQueriesMock).toHaveBeenCalledWith(queryClient, {
      accessToken: 'token-1',
      includeLeaderboardPositions: true,
      regionCode: 'KR',
    });
  });

  it('shares the same realtime client with comments subscriptions', async () => {
    const { useComments } = await import('../comments/queries');
    const { useGameRealtimeInvalidation } = await import('./realtime');

    function HookHarness() {
      useComments(undefined);
      useGameRealtimeInvalidation('token-1', 'KR');
      return null;
    }

    const queryClient = new QueryClient();

    render(<HookHarness />, {
      wrapper: createWrapper(queryClient),
    });

    expect(clientInstances).toHaveLength(1);
  });
});
