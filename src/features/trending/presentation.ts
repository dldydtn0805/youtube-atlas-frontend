import type { VideoTrendSignal } from './types';

const VIEW_COUNT_DELTA_BADGE_THRESHOLD = 50_000;

export interface VideoTrendBadge {
  label: string;
  tone: 'new' | 'up' | 'views';
}

function trimTrailingZeroes(value: string) {
  return value.replace(/\.0$/, '');
}

export function formatCompactCount(value: number) {
  if (value >= 10_000) {
    return `${trimTrailingZeroes((value / 10_000).toFixed(value >= 100_000 ? 0 : 1))}만`;
  }

  if (value >= 1_000) {
    return `${trimTrailingZeroes((value / 1_000).toFixed(value >= 10_000 ? 0 : 1))}천`;
  }

  return String(value);
}

export function getVideoTrendBadges(signal?: VideoTrendSignal | null): VideoTrendBadge[] {
  if (!signal) {
    return [];
  }

  const badges: VideoTrendBadge[] = [];

  if (signal.isNew) {
    badges.push({
      label: 'NEW',
      tone: 'new',
    });
  }

  if ((signal.rankChange ?? 0) > 0) {
    badges.push({
      label: `+${signal.rankChange}`,
      tone: 'up',
    });
  }

  if ((signal.viewCountDelta ?? 0) >= VIEW_COUNT_DELTA_BADGE_THRESHOLD) {
    badges.push({
      label: `조회수 +${formatCompactCount(signal.viewCountDelta as number)}`,
      tone: 'views',
    });
  }

  return badges.slice(0, 2);
}
