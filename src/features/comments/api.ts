import { supabase } from '../../lib/supabase';
import type { ChatMessage, SendMessageInput } from './types';

const COMMENTS_TABLE = 'comments';

function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return supabase;
}

export async function fetchComments(videoId: string): Promise<ChatMessage[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(COMMENTS_TABLE)
    .select('id, video_id, author, content, client_id, created_at')
    .eq('video_id', videoId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ChatMessage[];
}

export async function createComment(input: SendMessageInput): Promise<ChatMessage> {
  const client = getSupabaseClient();
  const author = input.author.trim() || '익명';
  const content = input.content.trim();

  if (!content) {
    throw new Error('메시지 내용을 입력해 주세요.');
  }

  const { data, error } = await client
    .from(COMMENTS_TABLE)
    .insert({
      author,
      client_id: input.clientId,
      content,
      video_id: input.videoId,
    })
    .select('id, video_id, author, content, client_id, created_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ChatMessage;
}

export { COMMENTS_TABLE };
