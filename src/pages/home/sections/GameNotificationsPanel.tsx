import type { GameNotification } from '../../../features/game/types';
import { getGameNotificationLabel, getGameNotificationTone } from './gameNotificationLabels';
import {
  getGameNotificationHeading,
  getGameNotificationMessage,
  getGameNotificationStatus,
} from './gameNotificationContent';
import {
  isProjectedHighlightNotification,
  isTierScoreGainNotification,
  isTitleUnlockNotification,
} from './gameNotificationEventType';
import GameNotificationMedia from './GameNotificationMedia';
import { hasProjectedGameNotificationScore, hasResolvedGameNotificationScore } from './gameNotificationModalUtils';
import './GameNotificationsPanel.css';

interface GameNotificationsPanelProps {
  isLoading?: boolean;
  notifications: GameNotification[];
  onClear?: () => void;
  onDelete?: (notificationId: string) => void;
  onOpenHighlights?: () => void;
  onOpenSell?: (notification: GameNotification) => void;
  onSelect?: (notification: GameNotification) => void;
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

function GameNotificationsPanel({
  isLoading = false,
  notifications,
  onClear,
  onDelete,
  onOpenHighlights,
  onOpenSell,
  onSelect,
}: GameNotificationsPanelProps) {
  const visibleNotifications = notifications;

  return (
    <div className="game-notifications">
      <div className="game-notifications__header">
        <span className="app-shell__profile-card-section-label">알림 내역</span>
        <div className="game-notifications__actions">
          {isLoading ? <span className="game-notifications__status">업데이트 중</span> : null}
          {visibleNotifications.length > 0 ? (
            <button className="game-notifications__clear" onClick={onClear} type="button">
              모두 지우기
            </button>
          ) : null}
        </div>
      </div>
      {visibleNotifications.length > 0 ? (
        <div className="game-notifications__list">
          {visibleNotifications.slice(0, 8).map((notification) => (
            (() => {
              const heading = getGameNotificationHeading(notification);
              const message = getGameNotificationMessage(notification);
              const hideMedia = isTitleUnlockNotification(notification);
              const canOpenSell =
                !hideMedia &&
                isProjectedHighlightNotification(notification) &&
                Boolean(onOpenSell) &&
                (notification.positionId != null || Boolean(notification.videoId));
              const canOpenHighlights =
                !hideMedia &&
                isTierScoreGainNotification(notification) &&
                Boolean(onOpenHighlights);

              return (
            <article
              className="game-notifications__item"
              data-projected={hasResolvedGameNotificationScore(notification) ? 'false' : 'true'}
              data-title-unlock={hideMedia ? 'true' : 'false'}
              key={notification.id}
            >
              <div className="game-notifications__body">
                {hideMedia ? null : canOpenSell ? (
                  <button
                    aria-label={`${heading} 즉시 매도 열기`}
                    className="game-notifications__thumb-button"
                    onClick={() => onOpenSell?.(notification)}
                    type="button"
                  >
                    <GameNotificationMedia className="game-notifications__thumb" notification={notification} />
                  </button>
                ) : canOpenHighlights ? (
                  <button
                    aria-label={`${heading} 하이라이트 탭 열기`}
                    className="game-notifications__thumb-button"
                    onClick={onOpenHighlights}
                    type="button"
                  >
                    <GameNotificationMedia className="game-notifications__thumb" notification={notification} />
                  </button>
                ) : (
                  <GameNotificationMedia className="game-notifications__thumb" notification={notification} />
                )}
                <button
                  aria-label={`${heading} 알림 보기`}
                  className="game-notifications__select"
                  onClick={() => onSelect?.(notification)}
                  type="button"
                >
                  <div className="game-notifications__copy">
                    <span className="game-notifications__type" data-tone={getGameNotificationTone(notification)}>
                      {getGameNotificationLabel(notification)}
                    </span>
                    <strong data-title-grade={hideMedia ? (notification.titleGrade ?? 'NORMAL').toLowerCase() : undefined}>
                      {heading}
                    </strong>
                    {message ? <p className="game-notifications__message">{message}</p> : null}
                    <span
                      className="game-notifications__score"
                      data-projected={hasResolvedGameNotificationScore(notification) ? 'false' : 'true'}
                    >
                      {hasProjectedGameNotificationScore(notification)
                        ? `${getGameNotificationStatus(notification)} 예상`
                        : getGameNotificationStatus(notification)}
                    </span>
                  </div>
                </button>
              </div>
              <div className="game-notifications__footer">
                <time dateTime={notification.createdAt}>{formatNotificationDate(notification.createdAt)}</time>
                <button
                  aria-label="알림 지우기"
                  className="game-notifications__delete"
                  onClick={() => onDelete?.(notification.id)}
                  type="button"
                >
                  지우기
                </button>
              </div>
            </article>
              );
            })()
          ))}
        </div>
      ) : (
        <p className="app-shell__profile-card-empty">아직 도착한 게임 알림이 없습니다.</p>
      )}
    </div>
  );
}

export default GameNotificationsPanel;
