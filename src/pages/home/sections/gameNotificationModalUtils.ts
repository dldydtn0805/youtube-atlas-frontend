import type { GameNotification } from '../../../features/game/types';

export function shouldOpenGameNotificationModal(notification: GameNotification) {
  return notification.showModal === true;
}

export function hasResolvedGameNotificationScore(notification: GameNotification) {
  return notification.showModal !== false;
}

export function hasProjectedGameNotificationScore(notification: GameNotification) {
  return (
    notification.showModal === false &&
    typeof notification.highlightScore === 'number' &&
    Number.isFinite(notification.highlightScore)
  );
}
