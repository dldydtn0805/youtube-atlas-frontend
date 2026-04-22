import { describe, expect, it } from 'vitest';
import type { GameNotification } from '../../../features/game/types';
import { getGameNotificationLabel } from './gameNotificationLabels';

const notice = (overrides: Partial<GameNotification> = {}) => ({
  id: 'notice-1',
  notificationEventType: 'TIER_SCORE_GAIN',
  notificationType: 'MOONSHOT',
  title: '티어 승급',
  message: '메시지',
  positionId: 1,
  videoId: 'video-1',
  videoTitle: '영상',
  channelTitle: '채널',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  strategyTags: ['MOONSHOT'],
  highlightScore: 1000,
  readAt: null,
  createdAt: '2026-04-22T00:00:00Z',
  ...overrides,
}) as GameNotification;

describe('getGameNotificationLabel', () => {
  it('labels tier promotions distinctly', () => {
    expect(
      getGameNotificationLabel(
        notice({ notificationEventType: 'TIER_PROMOTION', notificationType: 'TIER_PROMOTION', title: '티어 승급' }),
      ),
    ).toBe('티어 승급 알림');
  });

  it('labels resolved cashouts as tier score increases', () => {
    expect(getGameNotificationLabel(notice({ notificationType: 'BIG_CASHOUT', title: '빅 캐시아웃 기록' })))
      .toBe('티어 점수 상승 : 빅 캐시아웃');
  });

  it('labels projected cashouts as captured highlights', () => {
    expect(
      getGameNotificationLabel(
        notice({
          notificationEventType: 'PROJECTED_HIGHLIGHT',
          notificationType: 'BIG_CASHOUT',
          showModal: false,
          title: '빅 캐시아웃 예상',
        }),
      ),
    ).toBe('하이라이트 포착 : 빅 캐시아웃');
  });

  it('labels non-cashout resolved notifications as tier score increases', () => {
    expect(getGameNotificationLabel(notice())).toBe('티어 점수 상승 : 문샷');
  });

  it('labels projected moonshots as captured highlights', () => {
    expect(getGameNotificationLabel(notice({ notificationEventType: 'PROJECTED_HIGHLIGHT', showModal: false }))).toBe(
      '하이라이트 포착 : 문샷',
    );
  });
});
