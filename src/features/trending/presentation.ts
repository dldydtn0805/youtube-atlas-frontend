import type { VideoTrendSignal } from './types';

export const REALTIME_SURGING_RANK_CHANGE_THRESHOLD = 5;

export interface VideoTrendBadge {
  label: string;
  tone: 'new' | 'up' | 'down' | 'steady';
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
  const rankChange = signal.rankChange ?? 0;

  if (signal.isNew) {
    badges.push({
      label: 'NEW',
      tone: 'new',
    });
  }

  if (rankChange > 0) {
    badges.push({
      label: `▲ ${rankChange}`,
      tone: 'up',
    });
  }

  if (signal.rankChange === 0 && signal.previousRank !== null) {
    badges.push({
      label: '• 유지',
      tone: 'steady',
    });
  }

  if (rankChange < 0) {
    badges.push({
      label: `▼ ${Math.abs(rankChange)}`,
      tone: 'down',
    });
  }

  return badges;
}

export function getPrimaryVideoTrendBadge(signal?: VideoTrendSignal | null): VideoTrendBadge | null {
  const [badge] = getVideoTrendBadges(signal);

  if (!badge) {
    return null;
  }

  if (badge.tone === 'steady') {
    return {
      ...badge,
      label: '유지',
    };
  }

  if (badge.tone === 'up' || badge.tone === 'down') {
    return {
      ...badge,
      label: badge.label.replace(/\s+/g, ''),
    };
  }

  return badge;
}

export function isRealtimeSurgingSignal(signal?: VideoTrendSignal | null) {
  return (signal?.rankChange ?? 0) >= REALTIME_SURGING_RANK_CHANGE_THRESHOLD;
}

export function getFallbackNewBadge() {
  return {
    label: 'NEW',
    tone: 'new',
  } satisfies VideoTrendBadge;
}
