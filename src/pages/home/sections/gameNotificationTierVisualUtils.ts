import type { GameNotification } from '../../../features/game/types';

const TIER_NAME_TO_CODE = {
  브론즈: 'BRONZE',
  실버: 'SILVER',
  골드: 'GOLD',
  플래티넘: 'PLATINUM',
  다이아몬드: 'DIAMOND',
  마스터: 'MASTER',
  레전드: 'LEGEND',
} as const;

type TierName = keyof typeof TIER_NAME_TO_CODE;

const TIER_NAMES = Object.keys(TIER_NAME_TO_CODE) as TierName[];

export function isTierPromotionNotification(notification: GameNotification) {
  return notification.notificationType === 'TIER_PROMOTION';
}

export function getTierPromotionMeta(notification: GameNotification) {
  if (!isTierPromotionNotification(notification)) {
    return null;
  }

  const source = [
    notification.videoTitle,
    notification.title,
    notification.message,
  ]
    .filter(Boolean)
    .join(' ');

  const matchedName = TIER_NAMES.find((tierName) => source.includes(tierName));

  if (!matchedName) {
    return null;
  }

  return {
    displayName: matchedName,
    tierCode: TIER_NAME_TO_CODE[matchedName],
  };
}
