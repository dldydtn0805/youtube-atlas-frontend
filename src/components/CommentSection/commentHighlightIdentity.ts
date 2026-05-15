import type { CommentHighlightMessage } from '../../features/comments/highlightTypes';

const DEFAULT_HIGHLIGHT_LABEL = '인기 댓글';

export function getCommentHighlightIdentity(highlight: CommentHighlightMessage) {
  const label = highlight.source === 'YOUTUBE_COMMENT'
    ? DEFAULT_HIGHLIGHT_LABEL
    : highlight.label.trim() || DEFAULT_HIGHLIGHT_LABEL;

  return {
    label,
  };
}
