import { getStoredAccessToken } from '../auth/storage';
import { fetchApi } from '../../lib/api';
import type { ChatMessage, SendMessageInput } from './types';
import {
  CommentSubmissionError,
  normalizeMessageContent,
  toCommentSubmissionError,
} from './spam';

const COMMENTS_TOPIC = '/topic/comments';

export async function fetchComments(): Promise<ChatMessage[]> {
  return fetchApi<ChatMessage[]>('/api/comments');
}

export async function createComment(input: SendMessageInput): Promise<ChatMessage> {
  const author = input.author.trim() || '익명';
  const content = normalizeMessageContent(input.content);
  const accessToken = getStoredAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!content) {
    throw new CommentSubmissionError('validation');
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    return await fetchApi<ChatMessage>('/api/comments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        author,
        clientId: input.clientId,
        content,
      }),
    });
  } catch (error) {
    throw toCommentSubmissionError(error);
  }
}

export { COMMENTS_TOPIC };
