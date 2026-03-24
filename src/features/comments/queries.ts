import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getWebSocketUrl } from '../../lib/api';
import { COMMENTS_TOPIC_PREFIX, createComment, fetchComments } from './api';
import type { ChatMessage, SendMessageInput } from './types';

function commentsQueryKey(videoId?: string) {
  return ['comments', videoId] as const;
}

function mergeComment(existing: ChatMessage[] = [], nextComment: ChatMessage) {
  const nextComments = existing.some((comment) => comment.id === nextComment.id)
    ? existing.map((comment) => (comment.id === nextComment.id ? nextComment : comment))
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

    const client = new Client({
      brokerURL: getWebSocketUrl(),
      debug: () => {},
      reconnectDelay: 5_000,
    });

    client.onConnect = () => {
      client.subscribe(`${COMMENTS_TOPIC_PREFIX}/${videoId}/comments`, (message) => {
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
