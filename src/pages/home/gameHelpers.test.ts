import { describe, expect, it } from 'vitest';
import {
  formatCoins,
  formatCompactCoins,
  formatCompactPoints,
  formatFullCoins,
  formatFullPoints,
  formatGameQuantity,
  formatPointBalance,
  formatPoints,
} from './gameHelpers';

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

  it('renders coin values with the C suffix', () => {
    expect(formatCoins(365_558)).toBe('365,558C');
    expect(formatCompactCoins(1_234_567_890_123_456)).toBe('1,234조 5,678억C');
    expect(formatFullCoins(1_234_567_890_123_456)).toBe('1,234,567,890,123,456C');
  });

  it('uses the compact point balance copy in helper text contexts', () => {
    expect(formatPointBalance(1_000_000_000_365_558)).toBe('1,000조 36만 포인트');
  });

  it('keeps smaller quantities expanded and compacts large ones', () => {
    expect(formatGameQuantity(1_234_567)).toBe('12,345.67개');
    expect(formatGameQuantity(12_345_678_900)).toBe('1억 2,345만개');
  });
});
