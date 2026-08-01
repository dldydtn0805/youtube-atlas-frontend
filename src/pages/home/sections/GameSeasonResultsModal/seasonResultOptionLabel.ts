import type { GameSeasonResult } from '../../../../features/game/types';

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });

function getOrdinal(value: number) {
  const mod100 = value % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  const suffix = value % 10 === 1 ? 'st' : value % 10 === 2 ? 'nd' : value % 10 === 3 ? 'rd' : 'th';

  return `${value}${suffix}`;
}

function parseDate(value: string) {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getSeasonResultOptionLabel(result: GameSeasonResult) {
  const startDate = parseDate(result.seasonStartAt);
  const regionLabel = result.regionCode === 'GLOBAL' ? '' : ` · ${result.regionCode}`;

  if (!startDate) {
    return `${result.seasonName}${regionLabel}`;
  }

  const weekOfMonth = Math.floor((startDate.getDate() - 1) / 7) + 1;

  return `${monthFormatter.format(startDate)}, ${getOrdinal(weekOfMonth)} season${regionLabel} · ${startDate.getFullYear()}`;
}
