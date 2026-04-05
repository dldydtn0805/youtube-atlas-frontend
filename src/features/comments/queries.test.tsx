import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from './types';

const clientInstances: MockClient[] = [];

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

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');

  return {
    ...actual,
    fetchComments: vi.fn().mockResolvedValue([]),
  };
});

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('comments queries', () => {
  afterEach(() => {
    clientInstances.length = 0;
  });

  it('merges duplicate comment events when the realtime payload uses a different id', async () => {
    const { mergeComment } = await import('./queries');
    const existingComment: ChatMessage = {
      author: 'Tester',
      client_id: 'client-1',
      content: 'hello world',
      created_at: '2026-04-06T10:00:00.000Z',
      id: 101,
      video_id: 'video-1',
    };
    const broadcastComment: ChatMessage = {
      author: 'Tester',
      client_id: 'client-1',
      content: 'hello world',
      created_at: '2026-04-06T10:00:01.200Z',
      id: 202,
      video_id: 'video-1',
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
});
