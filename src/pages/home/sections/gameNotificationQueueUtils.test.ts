import { describe, expect, it } from 'vitest';
import type { GameNotification } from '../../../features/game/types';
import {
  enqueueGameNotification,
  removeGameNotification,
} from './gameNotificationQueueUtils';

const baseNotification: GameNotification = {
  id: 'notice-1',
  notificationEventType: 'TIER_SCORE_GAIN',
  notificationType: 'MOONSHOT',
  title: '티어 점수 상승',
  message: '테스트 알림',
  positionId: 1,
  videoId: 'video-1',
  videoTitle: '테스트 영상',
  channelTitle: '테스트 채널',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  strategyTags: ['MOONSHOT'],
  highlightScore: 1000,
  readAt: null,
  createdAt: '2026-04-23T00:00:00Z',
  showModal: true,
};

describe('gameNotificationQueueUtils', () => {
  it('appends unseen notifications to the queue', () => {
    const secondNotification = {
      ...baseNotification,
      id: 'notice-2',
    };

    expect(
      enqueueGameNotification([baseNotification], secondNotification),
    ).toEqual([baseNotification, secondNotification]);
  });

  it('keeps duplicate notifications out of the queue', () => {
    expect(
      enqueueGameNotification([baseNotification], baseNotification),
    ).toEqual([baseNotification]);
  });

  it('removes the matching notification from the queue', () => {
    const secondNotification = {
      ...baseNotification,
      id: 'notice-2',
    };

    expect(
      removeGameNotification([baseNotification, secondNotification], 'notice-1'),
    ).toEqual([secondNotification]);
  });
});
