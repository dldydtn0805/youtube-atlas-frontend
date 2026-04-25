import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameCurrentSeason, GamePosition } from '../../../features/game/types';
import useHomeGameUiState from './useHomeGameUiState';

function createOpenPosition(overrides: Partial<GamePosition> = {}): GamePosition {
  return {
    id: 1,
    videoId: 'video-1',
    title: '테스트 영상',
    channelTitle: '테스트 채널',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    buyRank: 10,
    currentRank: 8,
    rankDiff: 2,
    quantity: 10,
    stakePoints: 10000,
    currentPricePoints: 12000,
    profitPoints: 2000,
    strategyTags: [],
    achievedStrategyTags: [],
    targetStrategyTags: [],
    projectedHighlightScore: 20,
    chartOut: false,
    status: 'OPEN',
    buyCapturedAt: '2026-04-26T00:00:00.000Z',
    createdAt: '2026-04-26T00:00:00.000Z',
    closedAt: null,
    reservedForSell: false,
    scheduledSellOrderId: null,
    scheduledSellQuantity: 0,
    scheduledSellTargetRank: null,
    scheduledSellTriggerDirection: null,
    ...overrides,
  };
}

describe('useHomeGameUiState', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates remaining hold seconds every second while inventory has pending sell locks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-26T00:00:10.000Z'));

    const { result } = renderHook(() =>
      useHomeGameUiState({
        authStatus: 'authenticated',
        currentGameSeason: {
          minHoldSeconds: 20,
          regionCode: 'KR',
        } as GameCurrentSeason,
        openGamePositions: [
          createOpenPosition({
            createdAt: '2026-04-26T00:00:00.000Z',
          }),
        ],
        selectedVideoId: 'video-1',
      }),
    );

    expect(result.current.getRemainingHoldSeconds(createOpenPosition())).toBe(10);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.getRemainingHoldSeconds(createOpenPosition())).toBe(9);
  });
});
