import type { GameNotification } from '../../../features/game/types';
import { getGameNotificationHeading } from './gameNotificationContent';
import { getGameNotificationLabel, getGameNotificationTone } from './gameNotificationLabels';
import { hasProjectedGameNotificationScore, hasResolvedGameNotificationScore } from './gameNotificationModalUtils';
import './GameNotificationToast.css';

interface GameNotificationToastProps {
  notification: GameNotification | null;
  onDismiss: () => void;
}

function GameNotificationToast({ notification, onDismiss }: GameNotificationToastProps) {
  if (!notification) {
    return null;
  }

  const hasResolvedScore = hasResolvedGameNotificationScore(notification);
  const hasProjectedScore = hasProjectedGameNotificationScore(notification);
  const heading = getGameNotificationHeading(notification);

  return (
    <aside
      className="game-notification-toast"
      data-projected={hasResolvedScore ? 'false' : 'true'}
      role="status"
      aria-live="polite"
    >
      <img alt="" className="game-notification-toast__thumb" src={notification.thumbnailUrl} />
      <div className="game-notification-toast__copy">
        <span data-tone={getGameNotificationTone(notification)}>{getGameNotificationLabel(notification)}</span>
        <strong>{heading}</strong>
        <p>{notification.message}</p>
        {!hasResolvedScore ? (
          <p className="game-notification-toast__hint">
            {hasProjectedScore ? `예상 점수 +${notification.highlightScore?.toLocaleString('ko-KR')}점` : '매도 시 점수가 확정됩니다.'}
          </p>
        ) : null}
      </div>
      <button
        aria-label="게임 알림 닫기"
        className="game-notification-toast__close"
        onClick={onDismiss}
        type="button"
      >
        닫기
      </button>
    </aside>
  );
}

export default GameNotificationToast;
