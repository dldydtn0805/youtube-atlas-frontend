interface CommentHighlightLabelProps {
  label: string;
}

export default function CommentHighlightLabel({ label }: CommentHighlightLabelProps) {
  return (
    <span className="comment-message__title-badge" title={label}>
      <span className="comment-message__title-name">{label}</span>
    </span>
  );
}
