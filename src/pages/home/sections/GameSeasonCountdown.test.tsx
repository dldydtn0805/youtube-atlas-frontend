import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GameSeasonCountdown from './GameSeasonCountdown';
import { formatSeasonTimeLeft } from './gameSeasonCountdownFormat';

describe('GameSeasonCountdown', () => {
  it('formats the remaining season time as days, hours, minutes, and seconds', () => {
    expect(formatSeasonTimeLeft('2026-09-01T00:00:30.000Z', new Date('2026-06-01T00:00:00.000Z').getTime())).toBe(
      '92 일 0 시간 0 분 30 초 남음',
    );

    expect(formatSeasonTimeLeft('2026-06-02T05:10:09.000Z', new Date('2026-06-01T00:00:00.000Z').getTime())).toBe(
      '1 일 5 시간 10 분 9 초 남음',
    );
  });

  it('shows that the season has ended after the end time', () => {
    const nowMs = new Date('2026-08-02T00:00:00.000Z').getTime();

    expect(formatSeasonTimeLeft('2026-08-01T00:00:00.000Z', nowMs)).toBe('시즌 종료');
  });

  it('renders the countdown label', () => {
    render(<GameSeasonCountdown endAt="2099-09-01T00:00:00.000Z" />);

    expect(screen.getByText(/남음$/)).toBeInTheDocument();
  });
});
