import { describe, expect, it } from 'vitest';
import type { GameNotification } from '../../features/game/types';
import type { OpenGameHolding } from './gameHelpers';
import { getGameNotificationSellTargetHolding } from './homeGameNotificationSell';

function createNotification(overrides: Partial<GameNotification> = {}): GameNotification {
  return {
    id: 'notification-1',
    notificationEventType: 'PROJECTED_HIGHLIGHT',
    notificationType: 'MOONSHOT',
    title: '하이라이트 포착',
    message: '',
    positionId: 10,
    videoId: 'video-1',
    videoTitle: '테스트 영상',
    channelTitle: '테스트 채널',
    thumbnailUrl: null,
    strategyTags: ['MOONSHOT'],
    highlightScore: 100,
    readAt: null,
    createdAt: '2026-05-03T00:00:00.000Z',
    ...overrides,
  };
}

function createHolding(overrides: Partial<OpenGameHolding> = {}): OpenGameHolding {
  return {
    positionId: 10,
    videoId: 'video-1',
    title: '테스트 영상',
    channelTitle: '테스트 채널',
    thumbnailUrl: '',
    buyRank: 10,
    currentRank: 1,
    chartOut: false,
    quantity: 100,
    sellableQuantity: 0,
    lockedQuantity: 100,
    nextSellableInSeconds: 60,
    stakePoints: 1000,
    currentPricePoints: 1200,
    profitPoints: 200,
    strategyTags: ['MOONSHOT'],
    achievedStrategyTags: [],
    targetStrategyTags: [],
    projectedHighlightScore: 100,
    createdAt: '2026-05-03T00:00:00.000Z',
    reservedForSell: false,
    scheduledSellOrderId: null,
    scheduledSellTargetRank: null,
    scheduledSellTriggerDirection: null,
    scheduledSellQuantity: 0,
    ...overrides,
  };
}

describe('getGameNotificationSellTargetHolding', () => {
  it('reports no sellable quantity for a matched unsellable position', () => {
    const result = getGameNotificationSellTargetHolding(createNotification(), [createHolding()]);

    expect(result.status).toBe('noSellableQuantity');
  });

  it('reports no sellable quantity when only unsellable video holdings exist', () => {
    const result = getGameNotificationSellTargetHolding(
      createNotification({ positionId: null }),
      [createHolding({ positionId: 20 })],
    );

    expect(result.status).toBe('noSellableQuantity');
  });

  it('selects a sellable video holding when the notification has no position match', () => {
    const result = getGameNotificationSellTargetHolding(
      createNotification({ positionId: null }),
      [createHolding({ positionId: 20, sellableQuantity: 100 })],
    );

    expect(result).toEqual({
      status: 'ready',
      holding: expect.objectContaining({ positionId: 20 }),
    });
  });
});
