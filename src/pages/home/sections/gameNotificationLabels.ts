import type { GameNotification } from '../../../features/game/types';
import { isProjectedHighlightNotification, isTierPromotionNotification } from './gameNotificationEventType';
import { getTierPromotionMeta } from './gameNotificationTierVisualUtils';

const NOTIFICATION_LABELS = {
  BIG_CASHOUT: '빅 캐시아웃',
  SMALL_CASHOUT: '스몰 캐시아웃',
  MOONSHOT: '문샷',
  SNIPE: '스나이프',
} as const;

export function getGameNotificationLabel(notification: GameNotification) {
  if (notification.notificationType === 'TIER_PROMOTION') {
    return '티어 승급 알림';
  }

  const detail = NOTIFICATION_LABELS[notification.notificationType as keyof typeof NOTIFICATION_LABELS];
  const prefix = isProjectedHighlightNotification(notification) ? '하이라이트 포착' : '티어 점수 상승';

  if (detail) {
    return `${prefix} : ${detail}`;
  }

  return prefix;
}

export function getGameNotificationTone(notification: GameNotification) {
  if (notification.notificationType === 'TIER_PROMOTION') {
    const tierMeta = getTierPromotionMeta(notification);
    return tierMeta ? tierMeta.tierCode.toLowerCase() : 'tier';
  }

  if (notification.notificationType === 'BIG_CASHOUT') {
    return 'big-cashout';
  }

  if (notification.notificationType === 'SMALL_CASHOUT') {
    return 'small-cashout';
  }

  if (notification.notificationType === 'MOONSHOT') {
    return 'moonshot';
  }

  if (notification.notificationType === 'SNIPE') {
    return 'snipe';
  }

  return 'default';
}
