import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GameSeasonCountdown from './GameSeasonCountdown';
import { formatSeasonTimeLeft } from './gameSeasonCountdownFormat';

describe('GameSeasonCountdown', () => {
  it('formats the remaining season time with the season number', () => {
    expect(
      formatSeasonTimeLeft(
        '2026-03-31T05:10:09.000Z',
        new Date('2026-03-31T00:00:00.000Z').getTime(),
        '2026-01-01T00:00:00.000Z',
      ),
    ).toBe('1st 시즌 종료까지 5시간 10분 9 초 남음');
    expect(
      formatSeasonTimeLeft(
        '2026-07-01T00:00:30.000Z',
        new Date('2026-04-01T00:00:00.000Z').getTime(),
        '2026-04-01T00:00:00.000Z',
      ),
    ).toBe('2nd 시즌 종료까지 2184시간 0분 30 초 남음');
    expect(
      formatSeasonTimeLeft(
        '2026-08-01T00:00:30.000Z',
        new Date('2026-04-01T00:00:00.000Z').getTime(),
        '2026-08-01T00:00:00.000Z',
      ),
    ).toBe('3rd 시즌 종료까지 2928시간 0분 30 초 남음');
  });

  it('shows that the season has ended after the end time', () => {
    const nowMs = new Date('2026-08-02T00:00:00.000Z').getTime();

    expect(formatSeasonTimeLeft('2026-08-01T00:00:00.000Z', nowMs, '2026-04-01T00:00:00.000Z')).toBe('3rd 시즌 종료');
  });

  it('renders the countdown label', () => {
    render(<GameSeasonCountdown endAt="2099-08-01T00:00:00.000Z" startAt="2099-04-01T00:00:00.000Z" />);

    expect(screen.getByText(/남음$/)).toBeInTheDocument();
  });
});
