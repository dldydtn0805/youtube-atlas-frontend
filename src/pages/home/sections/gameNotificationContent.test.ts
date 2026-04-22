import { describe, expect, it } from 'vitest';
import type { GameNotification } from '../../../features/game/types';
import { getGameNotificationHeading, getGameNotificationMessage, getGameNotificationStatus } from './gameNotificationContent';

const notice = (overrides: Partial<GameNotification> = {}) => ({
  id: 'notice-1',
  notificationEventType: 'TIER_SCORE_GAIN',
  notificationType: 'MOONSHOT',
  title: '기본 알림',
  message: '기본 메시지',
  positionId: 1,
  videoId: 'video-1',
  videoTitle: '기본 영상',
  channelTitle: '채널',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  strategyTags: ['MOONSHOT'],
  highlightScore: 123,
  readAt: null,
  createdAt: '2026-04-22T00:00:00Z',
  ...overrides,
}) as GameNotification;

describe('gameNotificationContent', () => {
  it('uses the notification title for tier promotion headings', () => {
    expect(
      getGameNotificationHeading(
        notice({
          notificationType: 'TIER_PROMOTION',
          notificationEventType: 'TIER_PROMOTION',
          title: '실버 티어 승급',
          videoTitle: '',
        }),
      ),
    ).toBe('실버 티어 승급');
  });

  it('falls back to the parsed tier name when the tier promotion title is empty', () => {
    expect(
      getGameNotificationHeading(
        notice({
          notificationType: 'TIER_PROMOTION',
          notificationEventType: 'TIER_PROMOTION',
          title: ' ',
          message: '실버 티어에 도달했습니다.',
          videoTitle: '',
        }),
      ),
    ).toBe('실버 티어 승급');
  });

  it('returns the notification message for tier promotions in history', () => {
    expect(
      getGameNotificationMessage(
        notice({
          notificationType: 'TIER_PROMOTION',
          notificationEventType: 'TIER_PROMOTION',
          message: '실버로 승급했습니다.',
        }),
      ),
    ).toBe('실버로 승급했습니다.');
  });

  it('separates tier promotion status from highlight score copy', () => {
    expect(
      getGameNotificationStatus(
        notice({
          notificationType: 'TIER_PROMOTION',
          notificationEventType: 'TIER_PROMOTION',
          message: '실버 티어에 도달했습니다.',
          videoTitle: '',
        }),
      ),
    ).toBe('실버 티어 달성');
  });

  it('keeps highlight score copy for normal notifications', () => {
    expect(getGameNotificationStatus(notice({ highlightScore: 1200 }))).toBe('+1,200점');
  });
});
