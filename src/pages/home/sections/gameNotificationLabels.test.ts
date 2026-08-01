import { describe, expect, it } from 'vitest';
import type { GameNotification } from '../../../features/game/types';
import { getGameNotificationLabel, getGameNotificationTone } from './gameNotificationLabels';

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

  it('labels resolved cashouts as highlight records', () => {
    expect(getGameNotificationLabel(notice({
      notificationType: 'BIG_CASHOUT',
      strategyTags: ['BIG_CASHOUT'],
      title: '빅 캐시아웃 기록',
    }))).toBe('하이라이트 기록 : 빅 캐시아웃');
  });

  it('labels projected cashouts as captured highlights', () => {
    expect(
      getGameNotificationLabel(
        notice({
          notificationEventType: 'PROJECTED_HIGHLIGHT',
          notificationType: 'BIG_CASHOUT',
          strategyTags: ['BIG_CASHOUT'],
          showModal: false,
          title: '빅 캐시아웃 예상',
        }),
      ),
    ).toBe('하이라이트 포착 : 빅 캐시아웃');
  });

  it('labels non-cashout resolved notifications as highlight records', () => {
    expect(getGameNotificationLabel(notice())).toBe('하이라이트 기록 : 문샷');
  });

  it('labels atlas shot notifications and tone distinctly', () => {
    const notification = notice({
      notificationType: 'ATLAS_SHOT',
      strategyTags: ['ATLAS_SHOT', 'MOONSHOT'],
      title: '아틀라스 샷 기록',
    });

    expect(getGameNotificationLabel(notification)).toBe('하이라이트 기록 : 아틀라스 샷, 문샷');
    expect(getGameNotificationTone(notification)).toBe('atlas-shot');
  });

  it('labels galaxy shot notifications and tone distinctly', () => {
    const notification = notice({
      notificationType: 'GALAXY_SHOT',
      strategyTags: ['GALAXY_SHOT', 'SOLAR_SHOT'],
      title: '갤럭시 샷 기록',
    });

    expect(getGameNotificationLabel(notification)).toBe('하이라이트 기록 : 갤럭시 샷, 솔라 샷');
    expect(getGameNotificationTone(notification)).toBe('galaxy-shot');
  });

  it('labels solar shot notifications and tone distinctly', () => {
    const notification = notice({
      notificationType: 'SOLAR_SHOT',
      strategyTags: ['SOLAR_SHOT', 'MOONSHOT'],
      title: '솔라 샷 기록',
    });

    expect(getGameNotificationLabel(notification)).toBe('하이라이트 기록 : 솔라 샷, 문샷');
    expect(getGameNotificationTone(notification)).toBe('solar-shot');
  });

  it('labels projected moonshots as captured highlights', () => {
    expect(getGameNotificationLabel(notice({ notificationEventType: 'PROJECTED_HIGHLIGHT', showModal: false }))).toBe(
      '하이라이트 포착 : 문샷',
    );
  });

  it('falls back to the representative notification type when strategy tags are empty', () => {
    expect(getGameNotificationLabel(notice({ notificationType: 'SNIPE', strategyTags: [] }))).toBe(
      '하이라이트 기록 : 스나이프',
    );
  });

  it('labels title unlock notifications distinctly', () => {
    const notification = notice({
      notificationEventType: 'TITLE_UNLOCK',
      notificationType: 'TITLE_UNLOCK',
      videoId: null,
      videoTitle: null,
      thumbnailUrl: null,
      titleDisplayName: 'Atlas Seeker',
      titleGrade: 'SUPER',
      showModal: false,
    });

    expect(getGameNotificationLabel(notification)).toBe('칭호 획득');
    expect(getGameNotificationTone(notification)).toBe('super');
  });
});
