import { describe, expect, it } from 'vitest';
import type { GameNotification } from '../../../features/game/types';
import {
  hasProjectedGameNotificationScore,
  hasResolvedGameNotificationScore,
  shouldOpenGameNotificationModal,
} from './gameNotificationModalUtils';

const baseNotification: GameNotification = {
  id: 'game-1-MOONSHOT',
  notificationEventType: 'TIER_SCORE_GAIN',
  notificationType: 'MOONSHOT',
  title: '문샷 적중',
  message: '100위에서 잡은 영상이 10위까지 올라왔습니다.',
  positionId: 1,
  videoId: 'video-1',
  videoTitle: '테스트 영상',
  channelTitle: '테스트 채널',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  strategyTags: ['MOONSHOT'],
  highlightScore: 5000,
  readAt: null,
  createdAt: '2026-04-21T03:00:00Z',
  showModal: true,
};

describe('shouldOpenGameNotificationModal', () => {
  it('returns true when the backend marks the notification for modal display', () => {
    expect(shouldOpenGameNotificationModal(baseNotification)).toBe(true);
  });

  it('opens tier score gain notifications even without the backend modal flag', () => {
    expect(shouldOpenGameNotificationModal({ ...baseNotification, showModal: false })).toBe(true);
  });

  it('opens tier promotion notifications even without the backend modal flag', () => {
    expect(
      shouldOpenGameNotificationModal({
        ...baseNotification,
        notificationEventType: 'TIER_PROMOTION',
        notificationType: 'TIER_PROMOTION',
        showModal: false,
      }),
    ).toBe(true);
  });

  it('keeps projected highlight notifications out of the modal', () => {
    expect(
      shouldOpenGameNotificationModal({
        ...baseNotification,
        notificationEventType: 'PROJECTED_HIGHLIGHT',
        showModal: false,
      }),
    ).toBe(false);
  });

  it('treats null highlight score as a projected notification', () => {
    expect(
      hasResolvedGameNotificationScore({
        ...baseNotification,
        notificationEventType: 'PROJECTED_HIGHLIGHT',
        showModal: false,
      }),
    ).toBe(false);
  });

  it('treats finite highlight score as a settled notification', () => {
    expect(hasResolvedGameNotificationScore(baseNotification)).toBe(true);
  });

  it('treats non-modal score notification as a projected notification', () => {
    expect(
      hasProjectedGameNotificationScore({
        ...baseNotification,
        notificationEventType: 'PROJECTED_HIGHLIGHT',
        showModal: false,
      }),
    ).toBe(true);
  });

  it('treats explicit tier score gain notifications as settled even without modal display', () => {
    expect(
      hasResolvedGameNotificationScore({
        ...baseNotification,
        notificationEventType: 'TIER_SCORE_GAIN',
        showModal: false,
      }),
    ).toBe(true);
  });
});
