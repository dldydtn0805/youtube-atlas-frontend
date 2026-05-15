import type { CommentHighlightMessage as CommentHighlight } from '../../features/comments/highlightTypes';
import CommentHighlightLabel from './CommentHighlightLabel';
import { getCommentHighlightIdentity } from './commentHighlightIdentity';

interface Props { highlight: CommentHighlight }

export default function CommentHighlightAuthor({ highlight }: Props) {
  const identity = getCommentHighlightIdentity(highlight);
  const author = highlight.author.replace(/^@+/, '').trim() || highlight.author;

  return (
    <span className="comment-message__identity">
      <strong className="comment-message__author">{author}</strong>
      <CommentHighlightLabel label={identity.label} />
    </span>
  );
}
