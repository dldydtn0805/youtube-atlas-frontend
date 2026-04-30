import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from './types';

const clientInstances: MockClient[] = [];

class MockClient {
  brokerURL?: string;
  connectHeaders?: Record<string, string>;
  debug?: () => void;
  reconnectDelay?: number;
  onConnect?: () => void;
  subscribe = vi.fn(() => ({
    unsubscribe: vi.fn(),
  }));
  activate = vi.fn();
  deactivate = vi.fn(async () => {});

  constructor(config: {
    brokerURL: string;
    connectHeaders?: Record<string, string>;
    debug: () => void;
    reconnectDelay: number;
  }) {
    this.brokerURL = config.brokerURL;
    this.connectHeaders = config.connectHeaders;
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

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  const fetchCommentPresence = vi.fn().mockResolvedValue({ active_count: 0 });
  const updateCommentPresenceIdentity = vi.fn().mockResolvedValue({
    active_count: 1,
    participants: [
      {
        display_name: 'Atlas User',
        participant_id: 'participant-1',
      },
    ],
  });

  return {
    ...actual,
    fetchComments: vi.fn().mockResolvedValue([]),
    fetchCommentPresence,
    updateCommentPresenceIdentity,
  };
});

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('comments queries', () => {
  afterEach(async () => {
    clientInstances.length = 0;
    vi.clearAllMocks();
    const { resetCommentsRealtimeForTests } = await import('./queries');
    resetCommentsRealtimeForTests();
    const { resetSharedRealtimeClientForTests } = await import('../realtime/stompClient');
    resetSharedRealtimeClientForTests();
  });

  it('merges duplicate comment events when the realtime payload uses a different id', async () => {
    const { mergeComment } = await import('./queries');
    const existingComment: ChatMessage = {
      author: 'Tester',
      client_id: 'client-1',
      content: 'hello world',
      created_at: '2026-04-06T10:00:00.000Z',
      id: 101,
      video_id: 'global',
    };
    const broadcastComment: ChatMessage = {
      author: 'Tester',
      client_id: 'client-1',
      content: 'hello world',
      created_at: '2026-04-06T10:00:01.200Z',
      id: 202,
      video_id: 'global',
    };

    expect(mergeComment([existingComment], broadcastComment)).toEqual([
      {
        ...existingComment,
        ...broadcastComment,
      },
    ]);
  });

  it('does not subscribe after the effect has already been cleaned up', async () => {
    const { useComments } = await import('./queries');

    function HookHarness({ videoId }: { videoId: string }) {
      useComments(videoId);
      return null;
    }

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const view = render(<HookHarness videoId="video-1" />, {
      wrapper: createWrapper(queryClient),
    });
    const client = clientInstances.at(-1);

    expect(client).toBeDefined();

    view.unmount();
    client?.onConnect?.();

    expect(client?.subscribe).not.toHaveBeenCalled();
  });

  it('subscribes to the global comments topic', async () => {
    const { useComments } = await import('./queries');

    function HookHarness() {
      useComments(undefined);
      return null;
    }

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(<HookHarness />, {
      wrapper: createWrapper(queryClient),
    });
    const client = clientInstances.at(-1);

    client?.onConnect?.();

    expect(client?.subscribe).toHaveBeenCalledWith('/topic/comments', expect.any(Function));
    expect(client?.subscribe).toHaveBeenCalledWith('/topic/comments/presence', expect.any(Function));
    expect(client?.connectHeaders).toMatchObject({ 'x-participant-id': expect.any(String) });
  });

  it('reuses a single realtime client across multiple mounted comment hooks', async () => {
    const { useComments } = await import('./queries');

    function HookHarness() {
      useComments(undefined);
      return null;
    }

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <>
        <HookHarness />
        <HookHarness />
      </>,
      {
        wrapper: createWrapper(queryClient),
      },
    );

    expect(clientInstances).toHaveLength(1);
  });

  it('refetches presence after the realtime connection is established', async () => {
    const { useComments } = await import('./queries');
    const { fetchCommentPresence } = await import('./api');

    function HookHarness() {
      useComments(undefined);
      return null;
    }

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(<HookHarness />, {
      wrapper: createWrapper(queryClient),
    });

    let initialCallCount = 0;
    await waitFor(() => {
      initialCallCount = vi.mocked(fetchCommentPresence).mock.calls.length;
      expect(initialCallCount).toBeGreaterThan(0);
    });

    const client = clientInstances.at(-1);
    client?.onConnect?.();

    await waitFor(() => {
      expect(fetchCommentPresence).toHaveBeenCalledTimes(initialCallCount + 1);
    });
  });

  it('syncs the logged-in user name with the active chat participant', async () => {
    const { useComments } = await import('./queries');
    const { updateCommentPresenceIdentity } = await import('./api');

    function HookHarness() {
      useComments(undefined, true, {
        accessToken: 'access-token-1',
        participantId: 'participant-1',
      });
      return null;
    }

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(<HookHarness />, {
      wrapper: createWrapper(queryClient),
    });
    const client = clientInstances.at(-1);

    client?.onConnect?.();

    await waitFor(() => {
      expect(updateCommentPresenceIdentity).toHaveBeenCalledWith({
        accessToken: 'access-token-1',
        clientId: 'participant-1',
      });
    });
  });
});
