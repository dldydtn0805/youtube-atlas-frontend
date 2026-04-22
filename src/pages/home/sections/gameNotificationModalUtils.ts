import type { GameNotification } from '../../../features/game/types';
import {
  isProjectedHighlightNotification,
  isTierPromotionNotification,
  isTierScoreGainNotification,
} from './gameNotificationEventType';

export function shouldOpenGameNotificationModal(notification: GameNotification) {
  return (
    notification.showModal === true ||
    isTierPromotionNotification(notification) ||
    isTierScoreGainNotification(notification)
  );
}

export function hasResolvedGameNotificationScore(notification: GameNotification) {
  return isTierScoreGainNotification(notification) || notification.showModal !== false;
}

export function hasProjectedGameNotificationScore(notification: GameNotification) {
  return (
    isProjectedHighlightNotification(notification) &&
    typeof notification.highlightScore === 'number' &&
    Number.isFinite(notification.highlightScore)
  );
}
