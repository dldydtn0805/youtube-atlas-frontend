import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GameSeasonCountdown from './GameSeasonCountdown';
import { formatSeasonTimeLeft } from './gameSeasonCountdownFormat';

describe('GameSeasonCountdown', () => {
  it('formats the remaining season time with the four calendar seasons', () => {
    expect(
      formatSeasonTimeLeft(
        '2026-06-01T05:10:09.000Z',
        new Date('2026-06-01T00:00:00.000Z').getTime(),
        '2026-03-01T00:00:00.000Z',
      ),
    ).toBe('봄 시즌 종료까지 5시간 10분 9 초 남음');
    expect(
      formatSeasonTimeLeft(
        '2026-09-01T00:00:30.000Z',
        new Date('2026-06-01T00:00:00.000Z').getTime(),
        '2026-06-01T00:00:00.000Z',
      ),
    ).toBe('여름 시즌 종료까지 2208시간 0분 30 초 남음');
    expect(
      formatSeasonTimeLeft(
        '2026-12-01T00:00:30.000Z',
        new Date('2026-09-01T00:00:00.000Z').getTime(),
        '2026-09-01T00:00:00.000Z',
      ),
    ).toBe('가을 시즌 종료까지 2184시간 0분 30 초 남음');
    expect(
      formatSeasonTimeLeft(
        '2027-03-01T00:00:30.000Z',
        new Date('2026-12-01T00:00:00.000Z').getTime(),
        '2026-12-01T00:00:00.000Z',
      ),
    ).toBe('겨울 시즌 종료까지 2160시간 0분 30 초 남음');
  });

  it('shows that the season has ended after the end time', () => {
    const nowMs = new Date('2026-08-02T00:00:00.000Z').getTime();

    expect(formatSeasonTimeLeft('2026-08-01T00:00:00.000Z', nowMs, '2026-06-01T00:00:00.000Z')).toBe('여름 시즌 종료');
  });

  it('uses the exclusive end boundary when the start time is unavailable', () => {
    expect(
      formatSeasonTimeLeft(
        '2026-09-01T00:00:00.000Z',
        new Date('2026-08-31T23:59:59.000Z').getTime(),
      ),
    ).toBe('여름 시즌 종료까지 0시간 0분 1 초 남음');
  });

  it('renders the countdown label', () => {
    render(<GameSeasonCountdown endAt="2099-09-01T00:00:00.000Z" startAt="2099-06-01T00:00:00.000Z" />);

    expect(screen.getByText(/남음$/)).toBeInTheDocument();
  });
});
