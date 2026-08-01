import { describe, expect, it } from 'vitest';
import { parsePriceAnchorDrafts } from './priceAnchorDraft';

describe('parsePriceAnchorDrafts', () => {
  it('parses comma-formatted prices and sorts anchors by rank', () => {
    expect(
      parsePriceAnchorDrafts([
        { pricePoints: '3,000', rank: 200 },
        { pricePoints: '2,000,000', rank: 1 },
      ]),
    ).toEqual([
      { pricePoints: 2_000_000, rank: 1 },
      { pricePoints: 3_000, rank: 200 },
    ]);
  });

  it('rejects a lower-ranked anchor that costs more', () => {
    expect(() =>
      parsePriceAnchorDrafts([
        { pricePoints: '1000', rank: 1 },
        { pricePoints: '1100', rank: 10 },
      ]),
    ).toThrow('10위 가격은 1위 가격보다 높을 수 없습니다.');
  });
});
