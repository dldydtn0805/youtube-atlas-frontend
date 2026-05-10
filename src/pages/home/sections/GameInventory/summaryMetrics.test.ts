import { describe, expect, it } from 'vitest';
import type { OpenGameHolding } from '../../gameHelpers';
import { buildGameInventorySummary } from './summaryMetrics';

function createHolding(
  positionId: number,
  profitPoints: number,
  currentPricePoints: number,
  projectedHighlightScore = 0,
): OpenGameHolding {
  return {
    channelTitle: `Channel ${positionId}`,
    positionId,
    title: `Video ${positionId}`,
    profitPoints,
    currentPricePoints,
    projectedHighlightScore,
    stakePoints: 100,
  } as OpenGameHolding;
}

describe('buildGameInventorySummary', () => {
  it('orders bar segments by overall return contribution', () => {
    const summary = buildGameInventorySummary([
      createHolding(1, 10, 100),
      createHolding(2, 50, 200),
      createHolding(3, -20, 300),
    ]);

    expect(summary.segments.map((segment) => segment.id)).toEqual([2, 1, 3]);
  });

  it('includes video labels for clicked bar segments', () => {
    const summary = buildGameInventorySummary([createHolding(1, 10, 100)]);

    expect(summary.segments[0].tooltipLabel).toBe('Video 1 · Channel 1');
  });

  it('totals projected tier score from open holdings', () => {
    const summary = buildGameInventorySummary([
      createHolding(1, 10, 100, 1200),
      createHolding(2, -5, 90, 3400),
    ]);

    expect(summary.totalProjectedHighlightScore).toBe(4600);
  });
});
