function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatSeasonDurationLabel(startAt?: string | null, endAt?: string | null) {
  const startDate = parseDate(startAt);
  const endDate = parseDate(endAt);

  if (!startDate || !endDate) {
    return null;
  }

  const months =
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (endDate.getUTCMonth() - startDate.getUTCMonth());

  if (months <= 0) {
    return null;
  }

  return `${months}개월`;
}
