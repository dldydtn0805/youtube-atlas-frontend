function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatSeasonOrdinal(endDate: Date) {
  const month = endDate.getUTCMonth();

  if (month < 3) {
    return '1st';
  }

  if (month < 7) {
    return '2nd';
  }

  return '3rd';
}

export function formatSeasonDurationLabel(_startAt?: string | null, endAt?: string | null) {
  const endDate = parseDate(endAt);

  if (!endDate) {
    return null;
  }

  return formatSeasonOrdinal(endDate);
}
