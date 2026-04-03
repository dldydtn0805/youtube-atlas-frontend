import { describe, expect, it } from 'vitest';
import {
  buildRealtimeSurgingSection,
  REALTIME_SURGING_QUEUE_ID,
  shouldRenderRealtimeSurgingSection,
} from './utils';

describe('home utils', () => {
  it('renders realtime surging only when the all category is selected and supported', () => {
    expect(shouldRenderRealtimeSurgingSection(true, true)).toBe(true);
    expect(shouldRenderRealtimeSurgingSection(false, true)).toBe(false);
    expect(shouldRenderRealtimeSurgingSection(true, false)).toBe(false);
  });

  it('builds a realtime surging section for the all category', () => {
    expect(
      buildRealtimeSurgingSection(true, {
        regionCode: 'KR',
        categoryId: '0',
        categoryLabel: '전체',
        rankChangeThreshold: 5,
        totalCount: 1,
        capturedAt: '2026-04-04T00:00:00.000Z',
        items: [
          {
            categoryId: '0',
            categoryLabel: '전체',
            capturedAt: '2026-04-04T00:00:00.000Z',
            currentRank: 3,
            currentViewCount: 1_000_000,
            isNew: false,
            previousRank: 12,
            previousViewCount: 800_000,
            rankChange: 9,
            regionCode: 'KR',
            title: '급상승 영상',
            channelTitle: '테스트 채널',
            channelId: 'channel-1',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            videoId: 'video-1',
            viewCountDelta: 200_000,
          },
        ],
      }),
    ).toEqual({
      categoryId: REALTIME_SURGING_QUEUE_ID,
      description: '전체 차트에서 직전 집계 대비 순위가 5계단 이상 오른 영상을 모았습니다.',
      items: [
        expect.objectContaining({
          id: 'video-1',
          snippet: expect.objectContaining({
            categoryId: '0',
            channelTitle: '테스트 채널',
            title: '급상승 영상',
          }),
        }),
      ],
      label: '실시간 급상승',
    });
  });

  it('does not build a realtime surging section outside the all category', () => {
    expect(
      buildRealtimeSurgingSection(false, {
        regionCode: 'KR',
        categoryId: '0',
        categoryLabel: '전체',
        rankChangeThreshold: 5,
        totalCount: 0,
        capturedAt: '2026-04-04T00:00:00.000Z',
        items: [],
      }),
    ).toBeUndefined();
  });
});
