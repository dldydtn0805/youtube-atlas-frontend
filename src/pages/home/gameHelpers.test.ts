import { describe, expect, it } from 'vitest';
import { formatCompactPoints, formatFullPoints, formatPointBalance, formatPoints } from './gameHelpers';

describe('gameHelpers', () => {
  it('keeps smaller point values fully expanded', () => {
    expect(formatPoints(365_558)).toBe('365,558P');
    expect(formatCompactPoints(365_558)).toBe('365,558P');
  });

  it('compacts large point values with Korean large-number units', () => {
    expect(formatPoints(1_234_567_890_123_456)).toBe('1,234조 5,678억P');
    expect(formatCompactPoints(1_234_567_890_123_456)).toBe('1,234조 5,678억P');
    expect(formatCompactPoints(-12_345_678_901)).toBe('-123억 4,567만P');
  });

  it('can still render the full point value when needed', () => {
    expect(formatFullPoints(1_234_567_890_123_456)).toBe('1,234,567,890,123,456P');
  });

  it('uses the compact point balance copy in helper text contexts', () => {
    expect(formatPointBalance(1_000_000_000_365_558)).toBe('1,000조 36만 포인트');
  });
});
