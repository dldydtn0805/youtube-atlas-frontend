import { describe, expect, it } from 'vitest';
import {
  calculateBasePricePoints,
  calculateChartOutPricePoints,
  calculateOrderCountAdjustmentBps,
  calculateOrderCountPricePoints,
  calculateSignalPricePoints,
  DEFAULT_PRICE_ANCHORS,
  type PriceAnchor,
} from '../../../supabase/functions/_shared/game';

const anchors: ReadonlyArray<PriceAnchor> = [
  [1, 1_000],
  [10, 100],
  [200, 10],
];

describe('dynamic game price anchors', () => {
  it('keeps the balanced production defaults in sync with the database migration', () => {
    expect(Object.fromEntries(DEFAULT_PRICE_ANCHORS)).toMatchObject({
      1: 1_000_000,
      10: 600_000,
      50: 300_000,
      100: 125_000,
      150: 60_000,
      200: 40_000,
    });
  });

  it('uses supplied anchor values at exact ranks', () => {
    expect(calculateBasePricePoints(1, anchors)).toBe(1_000);
    expect(calculateBasePricePoints(10, anchors)).toBe(100);
    expect(calculateBasePricePoints(200, anchors)).toBe(10);
  });

  it('interpolates between supplied anchors without a rank-change premium', () => {
    const basePrice = calculateBasePricePoints(5, anchors);

    expect(basePrice).toBeLessThan(1_000);
    expect(basePrice).toBeGreaterThan(100);
    expect(
      calculateSignalPricePoints(
        {
          current_rank: 5,
          sync_buy_count: 0,
          sync_sell_count: 0,
        },
        anchors,
      ),
    ).toBe(basePrice);
  });

  it('derives the chart-out fallback from the editable 200th-rank anchor', () => {
    expect(calculateChartOutPricePoints(anchors)).toBe(10);
    expect(calculateChartOutPricePoints([[200, 30_000]])).toBe(29_000);
  });

  it('adds one percent premium per net buy count in the current sync', () => {
    expect(calculateOrderCountAdjustmentBps(0, 0)).toBe(0);
    expect(calculateOrderCountAdjustmentBps(3, 1)).toBe(200);
    expect(calculateOrderCountPricePoints(100_000, 3, 1)).toBe(102_000);
  });

  it('adds one percent sale discount per net sell count in the current sync', () => {
    expect(calculateOrderCountAdjustmentBps(1, 3)).toBe(-200);
    expect(calculateOrderCountPricePoints(100_000, 1, 3)).toBe(98_000);
  });

  it('uses the base price when buy and sell counts are equal', () => {
    expect(calculateOrderCountAdjustmentBps(12, 12)).toBe(0);
    expect(calculateOrderCountPricePoints(100_000, 12, 12)).toBe(100_000);
  });

  it('caps net count premiums and discounts at thirty percent', () => {
    expect(calculateOrderCountAdjustmentBps(100, 20)).toBe(3_000);
    expect(calculateOrderCountAdjustmentBps(20, 100)).toBe(-3_000);
    expect(calculateOrderCountPricePoints(100_000, 100, 20)).toBe(130_000);
    expect(calculateOrderCountPricePoints(100_000, 20, 100)).toBe(70_000);
  });
});
