import { describe, expect, it } from 'vitest';
import type { CommentHighlightMessage } from '../../features/comments/highlightTypes';
import { getCommentHighlightIdentity } from './commentHighlightIdentity';

function createHighlight(
  overrides: Partial<CommentHighlightMessage> = {},
): CommentHighlightMessage {
  return {
    author: 'Atlas',
    client_id: 'youtube:comment-1',
    content: '좋은 영상입니다.',
    created_at: '2026-07-31T00:00:00.000Z',
    ephemeral: true,
    id: 'comment-1',
    label: '인기 댓글',
    like_count: 10,
    message_type: 'COMMENT_HIGHLIGHT',
    source: 'YOUTUBE_COMMENT',
    video_id: 'video-1',
    ...overrides,
  };
}

describe('getCommentHighlightIdentity', () => {
  it('uses the YouTube highlight label for migrated Edge API data', () => {
    expect(getCommentHighlightIdentity(createHighlight())).toEqual({
      label: '인기 댓글',
    });
  });

  it('falls back safely when a legacy response omits its label', () => {
    expect(
      getCommentHighlightIdentity(
        createHighlight({
          label: undefined as unknown as string,
          source: 'LEGACY',
        }),
      ),
    ).toEqual({
      label: '인기 댓글',
    });
  });
});
