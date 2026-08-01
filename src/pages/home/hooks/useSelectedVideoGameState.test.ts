import { describe, expect, it } from 'vitest';
import type { GameCurrentSeason } from '../../../features/game/types';
import { buildSelectedVideoTrendBadgeSource } from './useSelectedVideoGameState';

describe('buildSelectedVideoTrendBadgeSource', () => {
  it('prefers the latest market entry over a stale selected trend signal', () => {
    const source = buildSelectedVideoTrendBadgeSource({
      currentGameSeason: { regionCode: 'GLOBAL' } as GameCurrentSeason,
      selectedCategoryId: '0',
      selectedCategoryLabel: '전체',
      selectedRegionCode: 'KR',
      selectedVideoMarketEntry: {
        buyBlockedReason: null,
        canBuy: true,
        capturedAt: '2026-04-17T09:00:00.000Z',
        channelTitle: '테스트 채널',
        currentPricePoints: 1000,
        currentRank: 15,
        currentViewCount: 1500,
        isNew: false,
        previousRank: 9,
        rankChange: -6,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        title: '테스트 영상',
        videoId: 'video-1',
        viewCountDelta: 300,
      },
      selectedVideoTrendSignal: {
        categoryId: '0',
        categoryLabel: '전체',
        capturedAt: '2026-04-17T08:00:00.000Z',
        currentRank: 9,
        currentViewCount: 1200,
        isNew: false,
        previousRank: 9,
        previousViewCount: 1100,
        rankChange: 0,
        regionCode: 'KR',
        videoId: 'video-1',
        viewCountDelta: 100,
      },
    });

    expect(source?.currentRank).toBe(15);
    expect(source?.previousRank).toBe(9);
    expect(source?.rankChange).toBe(-6);
    expect(source?.regionCode).toBe('KR');
  });
});
