import type { AuthStatus } from '../auth/types';
import './YouTubeLikeAction.css';

interface YouTubeLikeActionProps {
  authStatus: AuthStatus;
  isLiked: boolean;
  isPending: boolean;
  onToggle: () => void;
}

export default function YouTubeLikeAction({
  authStatus,
  isLiked,
  isPending,
  onToggle,
}: YouTubeLikeActionProps) {
  const isAuthenticated = authStatus === 'authenticated';
  const actionLabel = isLiked ? 'YouTube 좋아요 취소' : 'YouTube 계정으로 좋아요';

  return (
    <div className="app-shell__stage-action-item">
      <button
        aria-label={actionLabel}
        aria-pressed={isLiked}
        className="app-shell__stage-action-button app-shell__stage-action-button--youtube-like"
        data-active={isLiked}
        disabled={!isAuthenticated || isPending}
        onClick={onToggle}
        title={isAuthenticated ? actionLabel : 'Google 로그인 후 YouTube 좋아요를 사용할 수 있습니다.'}
        type="button"
      >
        <span className="app-shell__stage-action-icon" aria-hidden="true">
          {isPending ? (
            <span className="youtube-like-action__spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'}>
              <path
                d="M8.25 10.25 11.5 4.5c.55-.97 2.05-.58 2.05.54v3.71h3.53a2 2 0 0 1 1.94 2.48l-1.38 5.5a2 2 0 0 1-1.94 1.52H8.25m0-8v8m0-8H5.5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.75"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              />
            </svg>
          )}
        </span>
      </button>
      <span className="app-shell__stage-action-caption">
        {isPending ? '처리 중' : '좋아요'}
      </span>
    </div>
  );
}
