import { describe, expect, it } from 'vitest';
import { getDefaultSellOrderMode, getSellOrderCapacity } from './sellOrderMode';

describe('sell order mode capacity', () => {
  it('opens a newly bought holding in scheduled mode while instant sell stays locked', () => {
    expect(getDefaultSellOrderMode(0, 100)).toBe('scheduled');
    expect(getSellOrderCapacity('instant', 0, 100)).toBe(0);
    expect(getSellOrderCapacity('scheduled', 0, 100)).toBe(100);
  });

  it('keeps instant sell as the default after the next rank refresh', () => {
    expect(getDefaultSellOrderMode(100, 100)).toBe('instant');
  });
});
