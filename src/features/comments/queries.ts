import { useEffect } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getWebSocketUrl } from '../../lib/api';
import { COMMENTS_PRESENCE_TOPIC, COMMENTS_TOPIC, createComment, fetchCommentPresence, fetchComments } from './api';
import type { ChatMessage, ChatPresence, SendMessageInput } from './types';

const SAME_COMMENT_TIME_WINDOW_MS = 10_000;

const commentsQueryKey = ['comments', 'global'] as const;
const commentsPresenceQueryKey = ['comments', 'presence'] as const;

let sharedRealtimeClient: Client | null = null;
let sharedCommentsSubscription: StompSubscription | undefined;
let sharedPresenceSubscription: StompSubscription | undefined;
let sharedRealtimeConsumerCount = 0;
const sharedQueryClientRefCounts = new Map<QueryClient, number>();

function isSameCommentEvent(current: ChatMessage, next: ChatMessage) {
  if (current.id === next.id) {
    return true;
  }

  if (
    current.video_id !== next.video_id ||
    current.client_id !== next.client_id ||
    current.author !== next.author ||
    current.content !== next.content
  ) {
    return false;
  }

  const currentTime = new Date(current.created_at).getTime();
  const nextTime = new Date(next.created_at).getTime();

  if (Number.isNaN(currentTime) || Number.isNaN(nextTime)) {
    return current.created_at === next.created_at;
  }

  return Math.abs(currentTime - nextTime) <= SAME_COMMENT_TIME_WINDOW_MS;
}

export function mergeComment(existing: ChatMessage[] = [], nextComment: ChatMessage) {
  const existingIndex = existing.findIndex((comment) => isSameCommentEvent(comment, nextComment));
  const nextComments =
    existingIndex >= 0
      ? existing.map((comment, index) =>
          index === existingIndex ? { ...comment, ...nextComment } : comment,
        )
      : [...existing, nextComment];

  return nextComments.sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );
}

function pushCommentUpdate(nextComment: ChatMessage) {
  sharedQueryClientRefCounts.forEach((_, queryClient) => {
    queryClient.setQueryData<ChatMessage[]>(commentsQueryKey, (current = []) =>
      mergeComment(current, nextComment),
    );
  });
}

function pushPresenceUpdate(nextPresence: ChatPresence) {
  sharedQueryClientRefCounts.forEach((_, queryClient) => {
    queryClient.setQueryData<ChatPresence>(commentsPresenceQueryKey, nextPresence);
  });
}

function registerQueryClient(queryClient: QueryClient) {
  sharedQueryClientRefCounts.set(queryClient, (sharedQueryClientRefCounts.get(queryClient) ?? 0) + 1);
}

function unregisterQueryClient(queryClient: QueryClient) {
  const nextCount = (sharedQueryClientRefCounts.get(queryClient) ?? 0) - 1;

  if (nextCount <= 0) {
    sharedQueryClientRefCounts.delete(queryClient);
    return;
  }

  sharedQueryClientRefCounts.set(queryClient, nextCount);
}

function ensureSharedRealtimeClient() {
  if (sharedRealtimeClient) {
    return sharedRealtimeClient;
  }

  const client = new Client({
    brokerURL: getWebSocketUrl(),
    debug: () => {},
    reconnectDelay: 5_000,
  });

  client.onConnect = () => {
    if (sharedRealtimeClient !== client) {
      void client.deactivate();
      return;
    }

    sharedCommentsSubscription = client.subscribe(COMMENTS_TOPIC, (message) => {
      try {
        const nextComment = JSON.parse(message.body) as ChatMessage;

        pushCommentUpdate(nextComment);
      } catch {
        // Ignore malformed messages so the existing list stays usable.
      }
    });

    sharedPresenceSubscription = client.subscribe(COMMENTS_PRESENCE_TOPIC, (message) => {
      try {
        const nextPresence = JSON.parse(message.body) as ChatPresence;

        pushPresenceUpdate(nextPresence);
      } catch {
        // Ignore malformed presence updates so the existing count stays usable.
      }
    });
  };

  sharedRealtimeClient = client;
  client.activate();

  return client;
}

function releaseSharedRealtimeClient() {
  if (sharedRealtimeConsumerCount > 0) {
    sharedRealtimeConsumerCount -= 1;
  }

  if (sharedRealtimeConsumerCount > 0 || !sharedRealtimeClient) {
    return;
  }

  sharedCommentsSubscription?.unsubscribe();
  sharedPresenceSubscription?.unsubscribe();
  sharedCommentsSubscription = undefined;
  sharedPresenceSubscription = undefined;
  void sharedRealtimeClient.deactivate();
  sharedRealtimeClient = null;
}

export function useComments(_videoId?: string, enabled = true) {
  const queryClient = useQueryClient();
  const commentsQuery = useQuery({
    enabled,
    queryKey: commentsQueryKey,
    queryFn: fetchComments,
  });
  const presenceQuery = useQuery({
    enabled,
    queryKey: commentsPresenceQueryKey,
    queryFn: fetchCommentPresence,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    registerQueryClient(queryClient);
    sharedRealtimeConsumerCount += 1;
    ensureSharedRealtimeClient();

    return () => {
      unregisterQueryClient(queryClient);
      releaseSharedRealtimeClient();
    };
  }, [enabled, queryClient]);

  return {
    ...commentsQuery,
    presenceQuery,
  };
}

export function resetCommentsRealtimeForTests() {
  sharedCommentsSubscription?.unsubscribe();
  sharedPresenceSubscription?.unsubscribe();
  sharedCommentsSubscription = undefined;
  sharedPresenceSubscription = undefined;
  void sharedRealtimeClient?.deactivate();
  sharedRealtimeClient = null;
  sharedRealtimeConsumerCount = 0;
  sharedQueryClientRefCounts.clear();
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => createComment(input),
    onSuccess: (comment) => {
      queryClient.setQueryData<ChatMessage[]>(commentsQueryKey, (current = []) =>
        mergeComment(current, comment),
      );
    },
  });
}
