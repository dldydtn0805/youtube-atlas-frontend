export type CalendarSeasonCode = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

export interface CalendarGameSeason {
  code: CalendarSeasonCode;
  endAt: string;
  label: string;
  name: string;
  startAt: string;
}

interface CalendarSeasonDefinition {
  code: CalendarSeasonCode;
  endMonth: number;
  label: string;
  startMonth: number;
}

const CALENDAR_SEASONS: ReadonlyArray<CalendarSeasonDefinition> = [
  { code: 'SPRING', endMonth: 5, label: '봄', startMonth: 2 },
  { code: 'SUMMER', endMonth: 8, label: '여름', startMonth: 5 },
  { code: 'AUTUMN', endMonth: 11, label: '가을', startMonth: 8 },
];

export function getCalendarGameSeason(value: Date = new Date()): CalendarGameSeason {
  if (Number.isNaN(value.getTime())) {
    throw new Error('A valid date is required to resolve the game season.');
  }

  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  const definition = CALENDAR_SEASONS.find(
    (season) => month >= season.startMonth && month < season.endMonth,
  );

  if (definition) {
    return {
      code: definition.code,
      endAt: new Date(Date.UTC(year, definition.endMonth, 1)).toISOString(),
      label: definition.label,
      name: `${year} ${definition.label} 시즌`,
      startAt: new Date(Date.UTC(year, definition.startMonth, 1)).toISOString(),
    };
  }

  const winterStartYear = month === 11 ? year : year - 1;

  return {
    code: 'WINTER',
    endAt: new Date(Date.UTC(winterStartYear + 1, 2, 1)).toISOString(),
    label: '겨울',
    name: `${winterStartYear} 겨울 시즌`,
    startAt: new Date(Date.UTC(winterStartYear, 11, 1)).toISOString(),
  };
}
