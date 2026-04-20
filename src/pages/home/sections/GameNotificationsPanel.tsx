import type { GameNotification } from '../../../features/game/types';
import './GameNotificationsPanel.css';

interface GameNotificationsPanelProps {
  isLoading?: boolean;
  notifications: GameNotification[];
  onClear?: () => void;
}

const notificationDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatNotificationDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '방금';
  }

  return notificationDateFormatter.format(parsed);
}

function getNotificationLabel(type: string) {
  switch (type) {
    case 'MOONSHOT':
      return '문샷';
    case 'BIG_CASHOUT':
      return '빅 캐시아웃';
    case 'SMALL_CASHOUT':
      return '스몰 캐시아웃';
    case 'SNIPE':
      return '스나이핑';
    default:
      return '게임';
  }
}

function GameNotificationsPanel({ isLoading = false, notifications, onClear }: GameNotificationsPanelProps) {
  return (
    <div className="game-notifications">
      <div className="game-notifications__header">
        <span className="app-shell__profile-card-section-label">알림 내역</span>
        <div className="game-notifications__actions">
          {isLoading ? <span className="game-notifications__status">업데이트 중</span> : null}
          {notifications.length > 0 ? (
            <button className="game-notifications__clear" onClick={onClear} type="button">
              모두 지우기
            </button>
          ) : null}
        </div>
      </div>
      {notifications.length > 0 ? (
        <div className="game-notifications__list">
          {notifications.slice(0, 8).map((notification) => (
            <article className="game-notifications__item" key={notification.id}>
              <img alt="" className="game-notifications__thumb" src={notification.thumbnailUrl} />
              <div className="game-notifications__copy">
                <div className="game-notifications__meta">
                  <span>{getNotificationLabel(notification.notificationType)}</span>
                  <time dateTime={notification.createdAt}>{formatNotificationDate(notification.createdAt)}</time>
                </div>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
                <span>{notification.videoTitle}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="app-shell__profile-card-empty">아직 도착한 게임 알림이 없습니다.</p>
      )}
    </div>
  );
}

export default GameNotificationsPanel;
