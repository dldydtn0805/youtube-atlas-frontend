import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { COMMENTS_TABLE, createComment, fetchComments } from './api';
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
    if (!videoId || !enabled || !supabase) {
      return;
    }

    const client = supabase;
    const channel = client
      .channel(`comments:${videoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          filter: `video_id=eq.${videoId}`,
          schema: 'public',
          table: COMMENTS_TABLE,
        },
        (payload) => {
          queryClient.setQueryData<ChatMessage[]>(commentsQueryKey(videoId), (current = []) =>
            mergeComment(current, payload.new as ChatMessage),
          );
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
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
