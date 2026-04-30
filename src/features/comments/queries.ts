import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  COMMENTS_PRESENCE_TOPIC,
  COMMENTS_TOPIC,
  createComment,
  fetchCommentPresence,
  fetchComments,
  updateCommentPresenceIdentity,
} from './api';
import {
  subscribeToRealtimeConnection,
  subscribeToRealtimeTopic,
  resetSharedRealtimeClientForTests,
} from '../realtime/stompClient';
import type { ChatMessage, ChatPresence, SendMessageInput } from './types';

const SAME_COMMENT_TIME_WINDOW_MS = 10_000;

const commentsQueryKey = ['comments', 'global'] as const;
const commentsPresenceQueryKey = ['comments', 'presence'] as const;

interface UseCommentsOptions {
  accessToken?: string | null;
  participantId?: string | null;
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

export function useComments(_videoId?: string, enabled = true, options: UseCommentsOptions = {}) {
  const queryClient = useQueryClient();
  const { accessToken, participantId } = options;
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

    function syncPresenceIdentity() {
      if (!accessToken || !participantId) {
        return;
      }

      void updateCommentPresenceIdentity({ accessToken, clientId: participantId })
        .then((nextPresence) => {
          queryClient.setQueryData<ChatPresence>(commentsPresenceQueryKey, nextPresence);
        })
        .catch(() => {
          // Presence identity is a convenience; chat should keep working if it fails.
        });
    }

    const unsubscribeComments = subscribeToRealtimeTopic(COMMENTS_TOPIC, (messageBody) => {
      try {
        const nextComment = JSON.parse(messageBody) as ChatMessage;

        queryClient.setQueryData<ChatMessage[]>(commentsQueryKey, (current = []) =>
          mergeComment(current, nextComment),
        );
      } catch {
        // Ignore malformed messages so the existing list stays usable.
      }
    });
    const unsubscribePresence = subscribeToRealtimeTopic(COMMENTS_PRESENCE_TOPIC, (messageBody) => {
      try {
        const nextPresence = JSON.parse(messageBody) as ChatPresence;

        queryClient.setQueryData<ChatPresence>(commentsPresenceQueryKey, nextPresence);
      } catch {
        // Ignore malformed presence updates so the existing count stays usable.
      }
    });
    const unsubscribeConnection = subscribeToRealtimeConnection(() => {
      void queryClient.refetchQueries({
        queryKey: commentsPresenceQueryKey,
        exact: true,
        type: 'active',
      });
      syncPresenceIdentity();
    });

    return () => {
      unsubscribeComments();
      unsubscribePresence();
      unsubscribeConnection();
    };
  }, [accessToken, enabled, participantId, queryClient]);

  return {
    ...commentsQuery,
    presenceQuery,
  };
}

export function resetCommentsRealtimeForTests() {
  resetSharedRealtimeClientForTests();
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
