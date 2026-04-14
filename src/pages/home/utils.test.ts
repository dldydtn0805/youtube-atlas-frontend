import { describe, expect, it } from 'vitest';
import {
  BUYABLE_ONLY_PREFETCH_LIMIT,
  buildNewChartEntriesSection,
  buildRealtimeSurgingSection,
  calculateSellFeePoints,
  calculateSettledSellPoints,
  filterVideoSection,
  formatSignedProfitRate,
  formatSelectedVideoRankLabel,
  formatTrendRankLabel,
  getAdjacentGamePosition,
  isBuyableVideoSearchActive,
  NEW_CHART_ENTRIES_QUEUE_ID,
  REALTIME_SURGING_QUEUE_ID,
  relabelVideoSection,
  resolvePlaybackCategoryLabel,
  shouldRenderRealtimeSurgingSection,
  shouldPrefetchBuyableVideos,
} from './utils';
import type { GamePosition } from '../../features/game/types';
import type { YouTubeCategorySection } from '../../features/youtube/types';

function createVideoSection(categoryId: string, label: string, videoIds: string[]): YouTubeCategorySection {
  return {
    categoryId,
    description: `${label} 섹션`,
    items: videoIds.map((videoId) => ({
      id: videoId,
      contentDetails: { duration: '' },
      snippet: {
        title: videoId,
        channelTitle: '채널',
        channelId: 'channel-1',
        categoryId,
        thumbnails: {
          default: { url: 'https://example.com/default.jpg', width: 120, height: 90 },
          medium: { url: 'https://example.com/medium.jpg', width: 320, height: 180 },
          high: { url: 'https://example.com/high.jpg', width: 480, height: 360 },
        },
      },
    })),
    label,
  };
}

describe('home utils', () => {
  it('can skip adjacent positions that share the same video id', () => {
    const positions: GamePosition[] = [
      {
        id: 1,
        videoId: 'video-1',
        title: '첫 포지션',
        channelTitle: '채널',
        thumbnailUrl: '',
        buyRank: 1,
        currentRank: 1,
        rankDiff: 0,
        quantity: 1,
        stakePoints: 100,
        currentPricePoints: 100,
        profitPoints: 0,
        chartOut: false,
        status: 'OPEN',
        buyCapturedAt: '2026-04-14T00:00:00.000Z',
        createdAt: '2026-04-14T00:00:00.000Z',
        closedAt: null,
      },
      {
        id: 2,
        videoId: 'video-1',
        title: '둘째 포지션',
        channelTitle: '채널',
        thumbnailUrl: '',
        buyRank: 2,
        currentRank: 2,
        rankDiff: 0,
        quantity: 1,
        stakePoints: 100,
        currentPricePoints: 100,
        profitPoints: 0,
        chartOut: false,
        status: 'OPEN',
        buyCapturedAt: '2026-04-14T00:01:00.000Z',
        createdAt: '2026-04-14T00:01:00.000Z',
        closedAt: null,
      },
      {
        id: 3,
        videoId: 'video-2',
        title: '셋째 포지션',
        channelTitle: '채널',
        thumbnailUrl: '',
        buyRank: 3,
        currentRank: 3,
        rankDiff: 0,
        quantity: 1,
        stakePoints: 100,
        currentPricePoints: 100,
        profitPoints: 0,
        chartOut: false,
        status: 'OPEN',
        buyCapturedAt: '2026-04-14T00:02:00.000Z',
        createdAt: '2026-04-14T00:02:00.000Z',
        closedAt: null,
      },
    ];

    expect(
      getAdjacentGamePosition(positions, {
        currentPositionId: 1,
        currentVideoId: 'video-1',
        skipSameVideoId: true,
        step: 1,
      })?.id,
    ).toBe(3);
    expect(
      getAdjacentGamePosition(positions, {
        currentPositionId: 2,
        currentVideoId: 'video-1',
        skipSameVideoId: true,
        step: -1,
      })?.id,
    ).toBe(3);
  });

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

  it('calculates a 0.3% sell fee from gross sell points', () => {
    expect(calculateSellFeePoints(10_000)).toBe(30);
    expect(calculateSellFeePoints(9_999)).toBe(29);
    expect(calculateSellFeePoints(0)).toBe(0);
  });

  it('calculates settled sell points after the 0.3% fee', () => {
    expect(calculateSettledSellPoints(10_000)).toBe(9_970);
    expect(calculateSettledSellPoints(1)).toBe(1);
    expect(calculateSettledSellPoints(null)).toBe(0);
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
      label: '신규 진입',
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

  it('relabels a video section without changing its items', () => {
    expect(
      relabelVideoSection(
        {
          categoryId: '0',
          description: '테스트 섹션',
          items: [],
          label: '전체',
        },
        'TOP 200',
      ),
    ).toEqual({
      categoryId: '0',
      description: '테스트 섹션',
      items: [],
      label: 'TOP 200',
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

  it('keeps buyable video search active across chained prefetch gaps', () => {
    expect(
      isBuyableVideoSearchActive({
        hasNextPage: true,
        isBuyableOnlyFilterActive: true,
        isBuyableOnlyFilterAvailable: true,
        isFetchingNextPage: true,
        loadedItemCount: 50,
      }),
    ).toBe(true);

    expect(
      isBuyableVideoSearchActive({
        hasNextPage: true,
        isBuyableOnlyFilterActive: true,
        isBuyableOnlyFilterAvailable: true,
        isFetchingNextPage: false,
        loadedItemCount: 50,
      }),
    ).toBe(true);

    expect(
      isBuyableVideoSearchActive({
        hasNextPage: false,
        isBuyableOnlyFilterActive: true,
        isBuyableOnlyFilterAvailable: true,
        isFetchingNextPage: false,
        loadedItemCount: 50,
      }),
    ).toBe(false);

    expect(
      isBuyableVideoSearchActive({
        hasNextPage: true,
        isBuyableOnlyFilterActive: true,
        isBuyableOnlyFilterAvailable: true,
        isFetchingNextPage: false,
        loadedItemCount: BUYABLE_ONLY_PREFETCH_LIMIT,
      }),
    ).toBe(false);
  });

  it('formats the selected video overall rank label', () => {
    expect(formatSelectedVideoRankLabel('대한민국', 137)).toBe('137위');
    expect(formatSelectedVideoRankLabel('대한민국', 137, { chartOut: true })).toBe('차트 아웃');
    expect(formatSelectedVideoRankLabel('대한민국', null)).toBeUndefined();
  });

  it('formats current trend ranks before falling back to loading or missing states', () => {
    expect(
      formatTrendRankLabel(
        {
          categoryId: '0',
          categoryLabel: '전체',
          capturedAt: '2026-04-04T00:00:00.000Z',
          currentRank: 4,
          currentViewCount: 1000,
          isNew: false,
          previousRank: 4,
          previousViewCount: 900,
          rankChange: 0,
          regionCode: 'KR',
          videoId: 'video-1',
          viewCountDelta: 100,
        },
        true,
      ),
    ).toBe('4위');
    expect(formatTrendRankLabel(undefined, false)).toBe('현재 순위 확인 중');
    expect(formatTrendRankLabel(undefined, true)).toBe('현재 순위 미집계');
  });

  it('uses the active playback queue label when the queue is a chart section', () => {
    expect(
      resolvePlaybackCategoryLabel({
        activePlaybackQueueId: 'chart:music',
        extraPlaybackSections: [createVideoSection('chart:music', '음악', ['video-1'])],
        fallbackLabel: '전체',
        selectedPlaybackSection: createVideoSection('category:0', 'TOP 200', ['video-2']),
        selectedVideoId: 'video-1',
      }),
    ).toBe('음악');
  });

  it('infers the current video label for portfolio and history playback queues', () => {
    expect(
      resolvePlaybackCategoryLabel({
        activePlaybackQueueId: 'game-portfolio',
        fallbackLabel: '전체',
        realtimeSurgingSection: createVideoSection(REALTIME_SURGING_QUEUE_ID, '실시간 급상승', ['video-1']),
        selectedPlaybackSection: createVideoSection('category:0', 'TOP 200', ['video-1']),
        selectedVideoId: 'video-1',
      }),
    ).toBe('내 포지션');

    expect(
      resolvePlaybackCategoryLabel({
        activePlaybackQueueId: 'history-playback',
        extraPlaybackSections: [createVideoSection('chart:music', '음악', ['video-2'])],
        fallbackLabel: '전체',
        selectedPlaybackSection: createVideoSection('category:0', 'TOP 200', ['video-2']),
        selectedVideoId: 'video-2',
      }),
    ).toBe('거래내역');
  });

  it('formats position profit as a signed percentage', () => {
    expect(formatSignedProfitRate(250, 1000)).toBe('+25%');
    expect(formatSignedProfitRate(-125, 1000)).toBe('-12.5%');
    expect(formatSignedProfitRate(0, 1000)).toBe('0%');
  });

  it('returns pending text when a profit rate cannot be calculated', () => {
    expect(formatSignedProfitRate(null, 1000)).toBe('집계 중');
    expect(formatSignedProfitRate(100, null)).toBe('집계 중');
    expect(formatSignedProfitRate(100, 0)).toBe('집계 중');
  });

  it('supports overriding the fallback text when a profit rate is unavailable', () => {
    expect(formatSignedProfitRate(null, 1000, { unavailableText: '-' })).toBe('-');
    expect(formatSignedProfitRate(100, 0, { unavailableText: '-' })).toBe('-');
  });
});
