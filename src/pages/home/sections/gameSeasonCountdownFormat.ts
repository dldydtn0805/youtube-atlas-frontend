import { formatSeasonDurationLabel } from './gameSeasonDurationLabel';

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

export function formatSeasonTimeLeft(endAt: string, nowMs = Date.now(), startAt?: string | null) {
  const endDate = new Date(endAt);
  const endMs = endDate.getTime();

  if (!Number.isFinite(endMs)) {
    return null;
  }

  const seasonLabel = formatSeasonDurationLabel(startAt, endAt) ?? '시즌';

  const remainingMs = endMs - nowMs;

  if (remainingMs <= 0) {
    return `${seasonLabel} 시즌 종료`;
  }

  const hours = Math.floor(remainingMs / HOUR_MS);
  const minutes = Math.floor((remainingMs % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((remainingMs % MINUTE_MS) / SECOND_MS);

  return `${seasonLabel} 시즌 종료까지 ${hours}시간 ${minutes}분 ${seconds} 초 남음`;
}
