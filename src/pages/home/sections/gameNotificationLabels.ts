import type { GameNotification } from '../../../features/game/types';
import { buildGameStrategyBadges } from '../gameStrategyTags';
import { isProjectedHighlightNotification, isTitleUnlockNotification } from './gameNotificationEventType';
import { getTierPromotionMeta } from './gameNotificationTierVisualUtils';

export function getGameNotificationLabel(notification: GameNotification) {
  if (isTitleUnlockNotification(notification)) {
    return '칭호 획득';
  }

  if (notification.notificationType === 'TIER_PROMOTION') {
    return '티어 승급 알림';
  }

  const detail = buildGameStrategyBadges(notification.strategyTags, notification.notificationType)
    .map((badge) => badge.label)
    .join(', ');
  const prefix = isProjectedHighlightNotification(notification) ? '하이라이트 포착' : '하이라이트 기록';

  if (detail) {
    return `${prefix} : ${detail}`;
  }

  return prefix;
}

export function getGameNotificationTone(notification: GameNotification) {
  if (isTitleUnlockNotification(notification)) {
    return notification.titleGrade?.toLowerCase() ?? 'title';
  }

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

  if (notification.notificationType === 'ATLAS_SHOT') {
    return 'atlas-shot';
  }

  if (notification.notificationType === 'GALAXY_SHOT') {
    return 'galaxy-shot';
  }

  if (notification.notificationType === 'SOLAR_SHOT') {
    return 'solar-shot';
  }

  if (notification.notificationType === 'MOONSHOT') {
    return 'moonshot';
  }

  if (notification.notificationType === 'SNIPE') {
    return 'snipe';
  }

  return 'default';
}
