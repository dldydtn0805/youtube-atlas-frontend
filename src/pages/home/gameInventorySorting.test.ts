import { describe, expect, it } from 'vitest';
import type { OpenGameHolding } from './gameHelpers';
import { sortHoldingsByProfitRateDesc } from './gameInventorySorting';

function createHolding(overrides: Partial<OpenGameHolding>): OpenGameHolding {
  return {
    positionId: 1,
    videoId: 'video-1',
    title: 'Holding',
    channelTitle: 'Channel',
    thumbnailUrl: '',
    buyRank: 1,
    currentRank: 1,
    chartOut: false,
    quantity: 1,
    sellableQuantity: 1,
    lockedQuantity: 0,
    nextSellableInSeconds: null,
    stakePoints: 100,
    currentPricePoints: 100,
    profitPoints: 0,
    strategyTags: [],
    achievedStrategyTags: [],
    targetStrategyTags: [],
    projectedHighlightScore: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    reservedForSell: false,
    scheduledSellOrderId: null,
    scheduledSellTargetRank: null,
    scheduledSellTriggerDirection: null,
    scheduledSellQuantity: 0,
    ...overrides,
  };
}

describe('sortHoldingsByProfitRateDesc', () => {
  it('sorts inventory holdings by profit rate descending', () => {
    const holdings = [
      createHolding({ positionId: 1, profitPoints: 60, stakePoints: 200 }),
      createHolding({ positionId: 2, profitPoints: 20, stakePoints: 50 }),
      createHolding({ positionId: 3, profitPoints: null, stakePoints: 100 }),
      createHolding({ positionId: 4, profitPoints: -10, stakePoints: 50 }),
    ];

    expect(sortHoldingsByProfitRateDesc(holdings).map((holding) => holding.positionId)).toEqual([2, 1, 4, 3]);
  });
});
