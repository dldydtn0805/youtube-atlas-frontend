const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatSeasonTimeLeft(endAt: string, nowMs = Date.now()) {
  const endDate = new Date(endAt);
  const endMs = endDate.getTime();

  if (!Number.isFinite(endMs)) {
    return null;
  }

  const remainingMs = endMs - nowMs;

  if (remainingMs <= 0) {
    return '시즌 종료';
  }

  const days = Math.floor(remainingMs / DAY_MS);
  const hours = Math.floor((remainingMs % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((remainingMs % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((remainingMs % MINUTE_MS) / SECOND_MS);

  return `${days} 일 ${hours} 시간 ${minutes} 분 ${seconds} 초 남음`;
}
