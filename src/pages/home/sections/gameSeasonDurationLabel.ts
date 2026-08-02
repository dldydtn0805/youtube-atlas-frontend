function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export type CalendarSeasonTone = 'spring' | 'summer' | 'autumn' | 'winter';

export interface CalendarSeasonPresentation {
  label: '봄' | '여름' | '가을' | '겨울';
  tone: CalendarSeasonTone;
}

function formatCalendarSeason(date: Date): CalendarSeasonPresentation {
  const month = date.getUTCMonth();

  if (month >= 2 && month < 5) {
    return { label: '봄', tone: 'spring' };
  }

  if (month >= 5 && month < 8) {
    return { label: '여름', tone: 'summer' };
  }

  if (month >= 8 && month < 11) {
    return { label: '가을', tone: 'autumn' };
  }

  return { label: '겨울', tone: 'winter' };
}

export function getCalendarSeasonPresentation(startAt?: string | null, endAt?: string | null) {
  const startDate = parseDate(startAt);
  const endDate = parseDate(endAt);
  const seasonDate = startDate ?? (endDate ? new Date(endDate.getTime() - 1) : null);

  if (!seasonDate) {
    return null;
  }

  return formatCalendarSeason(seasonDate);
}
