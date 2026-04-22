import type { GameNotification } from '../../../features/game/types';
import { getTierPromotionMeta } from './gameNotificationTierVisualUtils';

const CASHOUT_NAMES = {
  BIG_CASHOUT: '빅',
  SMALL_CASHOUT: '스몰',
} as const;

const STRATEGY_NAMES = {
  MOONSHOT: '문샷',
  SNIPE: '스나이프',
} as const;

export function getGameNotificationLabel(notification: GameNotification) {
  if (notification.notificationType === 'TIER_PROMOTION') {
    return '티어 승급 알림';
  }

  if (notification.notificationType in CASHOUT_NAMES) {
    const name = CASHOUT_NAMES[notification.notificationType as keyof typeof CASHOUT_NAMES];

    if (notification.showModal === false) {
      return `하이라이트 포착 : ${name} 캐시아웃`;
    }

    return `매도 완료 : ${name} 캐시 아웃`;
  }

  if (notification.notificationType in STRATEGY_NAMES) {
    const name = STRATEGY_NAMES[notification.notificationType as keyof typeof STRATEGY_NAMES];

    if (notification.showModal === false) {
      return `하이라이트 포착 : ${name}`;
    }

    return `하이라이트 달성 : ${name}`;
  }

  return notification.title;
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
