import { useEffect } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getWebSocketUrl } from '../../lib/api';
import { COMMENTS_TOPIC_PREFIX, createComment, fetchComments } from './api';
import type { ChatMessage, SendMessageInput } from './types';

const SAME_COMMENT_TIME_WINDOW_MS = 10_000;

function commentsQueryKey(videoId?: string) {
  return ['comments', videoId] as const;
}

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

export function useComments(videoId?: string, enabled = true) {
  const queryClient = useQueryClient();
  const query = useQuery({
    enabled: Boolean(videoId) && enabled,
    queryKey: commentsQueryKey(videoId),
    queryFn: () => fetchComments(videoId as string),
  });

  useEffect(() => {
    if (!videoId || !enabled) {
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

      subscription = client.subscribe(`${COMMENTS_TOPIC_PREFIX}/${videoId}/comments`, (message) => {
        try {
          const nextComment = JSON.parse(message.body) as ChatMessage;

          queryClient.setQueryData<ChatMessage[]>(commentsQueryKey(videoId), (current = []) =>
            mergeComment(current, nextComment),
          );
        } catch {
          // Ignore malformed messages so the existing list stays usable.
        }
      });
    };

    client.activate();

    return () => {
      isDisposed = true;
      subscription?.unsubscribe();
      void client.deactivate();
    };
  }, [enabled, queryClient, videoId]);

  return query;
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => createComment(input),
    onSuccess: (comment, variables) => {
      queryClient.setQueryData<ChatMessage[]>(commentsQueryKey(variables.videoId), (current = []) =>
        mergeComment(current, comment),
      );
    },
  });
}
