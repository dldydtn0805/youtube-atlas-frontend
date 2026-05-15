import type { CommentHighlightMessage as CommentHighlight } from '../../features/comments/highlightTypes';
import CommentHighlightAuthor from './CommentHighlightAuthor';

interface CommentHighlightMessageProps {
  highlight: CommentHighlight;
  formattedTime: string;
}

function CommentHighlightMessage({
  formattedTime,
  highlight,
}: CommentHighlightMessageProps) {
  return (
    <article className="comment-message">
      <div className="comment-message__meta">
        <CommentHighlightAuthor highlight={highlight} />
        <time className="comment-message__date" dateTime={highlight.created_at}>
          {formattedTime}
        </time>
      </div>
      <p className="comment-message__bubble">{highlight.content}</p>
    </article>
  );
}

export default CommentHighlightMessage;
