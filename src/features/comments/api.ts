import { fetchApi } from '../../lib/api';
import type { ChatMessage, SendMessageInput } from './types';
import {
  CommentSubmissionError,
  normalizeMessageContent,
  toCommentSubmissionError,
} from './spam';

const COMMENTS_TOPIC_PREFIX = '/topic/videos';

export async function fetchComments(videoId: string): Promise<ChatMessage[]> {
  return fetchApi<ChatMessage[]>(`/api/videos/${encodeURIComponent(videoId)}/comments`);
}

export async function createComment(input: SendMessageInput): Promise<ChatMessage> {
  const author = input.author.trim() || '익명';
  const content = normalizeMessageContent(input.content);

  if (!content) {
    throw new CommentSubmissionError('validation');
  }

  try {
    return await fetchApi<ChatMessage>(`/api/videos/${encodeURIComponent(input.videoId)}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

export { COMMENTS_TOPIC_PREFIX };
