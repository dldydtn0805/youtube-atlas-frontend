import './CommentHighlightToggle.css';

interface CommentHighlightToggleProps {
  active: boolean;
  onToggle: () => void;
}

export default function CommentHighlightToggle({
  active,
  onToggle,
}: CommentHighlightToggleProps) {
  const label = active ? '인기 댓글 안보기' : '인기 댓글 보기';

  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className="comment-section__highlight-toggle"
      data-active={active}
      onClick={onToggle}
      title={label}
      type="button"
    >
      {label}
    </button>
  );
}
