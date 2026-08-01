function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCalendarSeason(date: Date) {
  const month = date.getUTCMonth();

  if (month >= 2 && month < 5) {
    return '봄';
  }

  if (month >= 5 && month < 8) {
    return '여름';
  }

  if (month >= 8 && month < 11) {
    return '가을';
  }

  return '겨울';
}

export function formatSeasonDurationLabel(startAt?: string | null, endAt?: string | null) {
  const startDate = parseDate(startAt);
  const endDate = parseDate(endAt);
  const seasonDate = startDate ?? (endDate ? new Date(endDate.getTime() - 1) : null);

  if (!seasonDate) {
    return null;
  }

  return formatCalendarSeason(seasonDate);
}
