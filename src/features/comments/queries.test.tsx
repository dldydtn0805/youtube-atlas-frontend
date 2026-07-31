import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from './types';

const topicHandlers = new Map<string, Set<(message: string) => void>>();
const connectionHandlers = new Set<() => void>();

vi.mock('../realtime/stompClient', () => ({
  resetSharedRealtimeClientForTests: vi.fn(() => {
    topicHandlers.clear();
    connectionHandlers.clear();
  }),
  subscribeToAuthenticatedRealtimeTopic: vi.fn(
    (topic: string, _accessToken: string, handler: (message: string) => void) => {
      const handlers = topicHandlers.get(topic) ?? new Set();
      handlers.add(handler);
      topicHandlers.set(topic, handlers);
      return () => handlers.delete(handler);
    },
  ),
  subscribeToRealtimeConnection: vi.fn((handler: () => void) => {
    connectionHandlers.add(handler);
    return () => connectionHandlers.delete(handler);
  }),
  subscribeToRealtimeTopic: vi.fn((topic: string, handler: (message: string) => void) => {
    const handlers = topicHandlers.get(topic) ?? new Set();
    handlers.add(handler);
    topicHandlers.set(topic, handlers);
    return () => handlers.delete(handler);
  }),
}));

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');

  return {
    ...actual,
    fetchCommentHighlights: vi.fn().mockResolvedValue([
      {
        author: 'YouTube Viewer',
        client_id: 'yt-comment:comment-1',
        content: '좋아요 많은 댓글',
        created_at: '2026-05-03T10:00:00Z',
        ephemeral: true,
        id: 'yt-comment:comment-1',
        label: '인기 댓글',
        like_count: 10,
        message_type: 'COMMENT_HIGHLIGHT',
        source: 'YOUTUBE_COMMENT',
        video_id: 'video-1',
      },
    ]),
    fetchCommentPresence: vi.fn().mockResolvedValue({ active_count: 0 }),
    fetchComments: vi.fn().mockResolvedValue([]),
    updateCommentPresenceIdentity: vi.fn().mockResolvedValue({
      active_count: 1,
      participants: [
        {
          display_name: 'Atlas User',
          participant_id: 'participant-1',
        },
      ],
    }),
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

describe('comments queries', () => {
  afterEach(async () => {
    vi.clearAllMocks();
    topicHandlers.clear();
    connectionHandlers.clear();
    const { resetCommentsRealtimeForTests } = await import('./queries');
    resetCommentsRealtimeForTests();
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

  it('cleans up Supabase Realtime subscriptions when unmounted', async () => {
    const { useComments } = await import('./queries');

    function HookHarness() {
      useComments(undefined);
      return null;
    }

    const queryClient = new QueryClient();
    const view = render(<HookHarness />, {
      wrapper: createWrapper(queryClient),
    });

    expect(topicHandlers.get('/topic/comments')?.size).toBe(1);
    view.unmount();
    expect(topicHandlers.get('/topic/comments')?.size).toBe(0);
  });

  it('subscribes to Supabase comment and presence topics', async () => {
    const { useComments } = await import('./queries');

    function HookHarness() {
      useComments(undefined);
      return null;
    }

    const queryClient = new QueryClient();
    render(<HookHarness />, {
      wrapper: createWrapper(queryClient),
    });

    expect(topicHandlers.get('/topic/comments')?.size).toBe(1);
    expect(topicHandlers.get('/topic/comments/presence')?.size).toBe(1);
  });

  it('fetches comments for the selected region', async () => {
    const { useComments } = await import('./queries');
    const { fetchComments } = await import('./api');

    function HookHarness() {
      useComments(undefined, true, { regionCode: 'KR' });
      return null;
    }

    render(<HookHarness />, {
      wrapper: createWrapper(new QueryClient()),
    });

    await waitFor(() => {
      expect(fetchComments).toHaveBeenCalledWith('KR', null);
    });
  });

  it('requests only comments after the provided session start time', async () => {
    const { useComments } = await import('./queries');
    const { fetchComments } = await import('./api');

    function HookHarness() {
      useComments(undefined, true, {
        regionCode: 'KR',
        since: '2026-05-03T09:00:00.000Z',
      });
      return null;
    }

    render(<HookHarness />, {
      wrapper: createWrapper(new QueryClient()),
    });

    await waitFor(() => {
      expect(fetchComments).toHaveBeenCalledWith('KR', '2026-05-03T09:00:00.000Z');
    });
  });

  it('merges a Supabase insert into the active comment query', async () => {
    const { useComments } = await import('./queries');
    const { fetchComments } = await import('./api');

    function HookHarness() {
      const query = useComments(undefined);
      return <div>{query.data?.map((comment) => comment.content).join(',')}</div>;
    }

    render(<HookHarness />, {
      wrapper: createWrapper(new QueryClient()),
    });

    await waitFor(() => {
      expect(fetchComments).toHaveBeenCalled();
    });

    act(() => {
      emitTopic('/topic/comments', {
        author: 'Atlas',
        client_id: 'client-1',
        content: 'Supabase realtime',
        created_at: '2026-07-31T10:00:00Z',
        id: 1,
        video_id: 'global',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Supabase realtime')).toBeInTheDocument();
    });
  });

  it('refetches presence after the realtime connection is established', async () => {
    const { useComments } = await import('./queries');
    const { fetchCommentPresence } = await import('./api');

    function HookHarness() {
      useComments(undefined);
      return null;
    }

    render(<HookHarness />, {
      wrapper: createWrapper(new QueryClient()),
    });

    await waitFor(() => {
      expect(fetchCommentPresence).toHaveBeenCalled();
    });
    const initialCallCount = vi.mocked(fetchCommentPresence).mock.calls.length;

    act(() => {
      connectionHandlers.forEach((handler) => handler());
    });

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

    render(<HookHarness />, {
      wrapper: createWrapper(new QueryClient()),
    });

    act(() => {
      connectionHandlers.forEach((handler) => handler());
    });

    await waitFor(() => {
      expect(updateCommentPresenceIdentity).toHaveBeenCalledWith({
        accessToken: 'access-token-1',
        clientId: 'participant-1',
      });
    });
  });

  it('loads YouTube comment highlights through the Edge API', async () => {
    const { useCommentHighlights } = await import('./queries');

    function HookHarness() {
      const highlights = useCommentHighlights('video-1', 'access-token-1');

      return <div>{highlights.map((highlight) => highlight.content).join(',')}</div>;
    }

    render(<HookHarness />, {
      wrapper: createWrapper(new QueryClient()),
    });

    await waitFor(() => {
      expect(screen.getByText('좋아요 많은 댓글')).toBeInTheDocument();
    });
  });
});
