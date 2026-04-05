import { describe, expect, it } from 'vitest';
import {
  BUYABLE_ONLY_PREFETCH_LIMIT,
  buildNewChartEntriesSection,
  buildRealtimeSurgingSection,
  filterVideoSection,
  NEW_CHART_ENTRIES_QUEUE_ID,
  REALTIME_SURGING_QUEUE_ID,
  shouldRenderRealtimeSurgingSection,
  shouldPrefetchBuyableVideos,
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

  it('builds a new chart entries section for the all category', () => {
    expect(
      buildNewChartEntriesSection(true, {
        regionCode: 'KR',
        categoryId: '0',
        categoryLabel: '전체',
        totalCount: 1,
        capturedAt: '2026-04-04T00:00:00.000Z',
        items: [
          {
            categoryId: '0',
            categoryLabel: '전체',
            capturedAt: '2026-04-04T00:00:00.000Z',
            currentRank: 19,
            currentViewCount: 250_000,
            isNew: true,
            previousRank: null,
            previousViewCount: null,
            rankChange: null,
            regionCode: 'KR',
            title: '신규 진입 영상',
            channelTitle: '테스트 채널',
            channelId: 'channel-2',
            thumbnailUrl: 'https://example.com/thumb-2.jpg',
            videoId: 'video-2',
            viewCountDelta: null,
          },
        ],
      }),
    ).toEqual({
      categoryId: NEW_CHART_ENTRIES_QUEUE_ID,
      description: '전체 차트에 이번 집계에서 새로 진입한 영상을 모았습니다.',
      items: [
        expect.objectContaining({
          id: 'video-2',
          snippet: expect.objectContaining({
            categoryId: '0',
            channelTitle: '테스트 채널',
            title: '신규 진입 영상',
          }),
        }),
      ],
      label: '신규 차트 등록',
    });
  });

  it('filters a video section while preserving section metadata', () => {
    expect(
      filterVideoSection(
        {
          categoryId: '0',
          description: '테스트 섹션',
          items: [
            {
              id: 'video-1',
              contentDetails: { duration: '' },
              snippet: {
                title: '첫 영상',
                channelTitle: '채널 A',
                channelId: 'channel-a',
                categoryId: '0',
                thumbnails: {
                  default: { url: 'https://example.com/1.jpg', width: 120, height: 90 },
                  medium: { url: 'https://example.com/1.jpg', width: 320, height: 180 },
                  high: { url: 'https://example.com/1.jpg', width: 480, height: 360 },
                },
              },
            },
            {
              id: 'video-2',
              contentDetails: { duration: '' },
              snippet: {
                title: '둘 영상',
                channelTitle: '채널 B',
                channelId: 'channel-b',
                categoryId: '0',
                thumbnails: {
                  default: { url: 'https://example.com/2.jpg', width: 120, height: 90 },
                  medium: { url: 'https://example.com/2.jpg', width: 320, height: 180 },
                  high: { url: 'https://example.com/2.jpg', width: 480, height: 360 },
                },
              },
            },
          ],
          label: '전체',
          nextPageToken: 'next-token',
        },
        (item) => item.id === 'video-2',
      ),
    ).toEqual({
      categoryId: '0',
      description: '테스트 섹션',
      items: [
        expect.objectContaining({
          id: 'video-2',
          snippet: expect.objectContaining({
            title: '둘 영상',
          }),
        }),
      ],
      label: '전체',
      nextPageToken: 'next-token',
    });
  });

  it('prefetches more pages only while buyable-only filtering needs more videos', () => {
    expect(
      shouldPrefetchBuyableVideos({
        hasNextPage: true,
        isBuyableOnlyFilterActive: true,
        isBuyableOnlyFilterAvailable: true,
        isFetchingNextPage: false,
        loadedItemCount: BUYABLE_ONLY_PREFETCH_LIMIT - 1,
      }),
    ).toBe(true);

    expect(
      shouldPrefetchBuyableVideos({
        hasNextPage: true,
        isBuyableOnlyFilterActive: false,
        isBuyableOnlyFilterAvailable: true,
        isFetchingNextPage: false,
        loadedItemCount: 50,
      }),
    ).toBe(false);

    expect(
      shouldPrefetchBuyableVideos({
        hasNextPage: true,
        isBuyableOnlyFilterActive: true,
        isBuyableOnlyFilterAvailable: true,
        isFetchingNextPage: true,
        loadedItemCount: 50,
      }),
    ).toBe(false);

    expect(
      shouldPrefetchBuyableVideos({
        hasNextPage: true,
        isBuyableOnlyFilterActive: true,
        isBuyableOnlyFilterAvailable: true,
        isFetchingNextPage: false,
        loadedItemCount: BUYABLE_ONLY_PREFETCH_LIMIT,
      }),
    ).toBe(false);
  });
});
