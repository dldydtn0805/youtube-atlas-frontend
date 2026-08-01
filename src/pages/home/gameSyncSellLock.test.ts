import { describe, expect, it } from 'vitest';
import type { GamePosition } from '../../features/game/types';
import { buildOpenGameHoldings } from './gameHelpers';

function createPosition(overrides: Partial<GamePosition> = {}): GamePosition {
  return {
    buyCapturedAt: '2026-07-31T10:00:00.000Z',
    buyRank: 10,
    channelTitle: 'Channel',
    chartOut: false,
    closedAt: null,
    createdAt: '2026-07-31T10:00:01.000Z',
    currentPricePoints: 100_000,
    currentRank: 10,
    id: 1,
    profitPoints: 0,
    quantity: 100,
    rankDiff: 0,
    stakePoints: 100_000,
    status: 'OPEN',
    thumbnailUrl: '',
    title: 'Video',
    videoId: 'video-1',
    ...overrides,
  };
}

describe('current trend sync sell lock', () => {
  it('keeps a newly bought position unsellable even after the time hold expires', () => {
    const [holding] = buildOpenGameHoldings(
      [createPosition({ sellLockedUntilNextSync: true })],
      () => 0,
    );

    expect(holding.sellableQuantity).toBe(0);
    expect(holding.lockedQuantity).toBe(100);
    expect(holding.nextSellableInSeconds).toBeNull();
    expect(holding.sellLockedUntilNextSync).toBe(true);
  });

  it('makes the position sellable after the next trend sync clears the lock', () => {
    const [holding] = buildOpenGameHoldings(
      [createPosition({ sellLockedUntilNextSync: false })],
      () => 0,
    );

    expect(holding.sellableQuantity).toBe(100);
    expect(holding.lockedQuantity).toBe(0);
  });
});
