import { describe, expect, it } from 'vitest';
import { getCalendarGameSeason } from '../../../supabase/functions/api/routes/calendar-season';

describe('calendar game seasons', () => {
  it.each([
    ['2026-03-01T00:00:00.000Z', 'SPRING', '2026 봄 시즌', '2026-03-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z'],
    ['2026-06-15T12:00:00.000Z', 'SUMMER', '2026 여름 시즌', '2026-06-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'],
    ['2026-09-30T23:59:59.000Z', 'AUTUMN', '2026 가을 시즌', '2026-09-01T00:00:00.000Z', '2026-12-01T00:00:00.000Z'],
    ['2026-12-01T00:00:00.000Z', 'WINTER', '2026 겨울 시즌', '2026-12-01T00:00:00.000Z', '2027-03-01T00:00:00.000Z'],
    ['2027-02-28T23:59:59.000Z', 'WINTER', '2026 겨울 시즌', '2026-12-01T00:00:00.000Z', '2027-03-01T00:00:00.000Z'],
  ])('resolves %s into a three-month %s season', (now, code, name, startAt, endAt) => {
    expect(getCalendarGameSeason(new Date(now))).toEqual({
      code,
      endAt,
      label: name.split(' ')[1],
      name,
      startAt,
    });
  });
});
