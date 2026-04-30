import type { SelectedAchievementTitle } from '../../features/game/types';

interface CommentAuthorTitleTextProps {
  title: SelectedAchievementTitle;
}

export default function CommentAuthorTitleText({ title }: CommentAuthorTitleTextProps) {
  return (
    <>
      <span className="comment-message__title-name" title={title.description}>
        {`, ${title.displayName}`}
      </span>
      <span className="comment-message__title-star" data-grade={title.grade} aria-hidden="true">
        ★
      </span>
    </>
  );
}
