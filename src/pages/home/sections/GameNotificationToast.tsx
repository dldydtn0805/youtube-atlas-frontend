import type { GameNotification } from '../../../features/game/types';
import './GameNotificationToast.css';

interface GameNotificationToastProps {
  notification: GameNotification | null;
  onDismiss: () => void;
}

function GameNotificationToast({ notification, onDismiss }: GameNotificationToastProps) {
  if (!notification) {
    return null;
  }

  return (
    <aside className="game-notification-toast" role="status" aria-live="polite">
      <img alt="" className="game-notification-toast__thumb" src={notification.thumbnailUrl} />
      <div className="game-notification-toast__copy">
        <span>{notification.title}</span>
        <strong>{notification.videoTitle}</strong>
        <p>{notification.message}</p>
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
