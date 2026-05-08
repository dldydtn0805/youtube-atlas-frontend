import { describe, expect, it } from 'vitest';
import type { GamePositionRankHistory } from '../../features/game/types';
import type { VideoRankHistory } from '../../features/trending/types';
import { mergeMultiplePositionHistories } from './homeRankHistory';

function createPositionHistory(overrides: Partial<GamePositionRankHistory> = {}): GamePositionRankHistory {
  const history = {
    buyCapturedAt: '2026-04-28T10:00:00.000Z',
    closedAt: '2026-04-28T10:10:00.000Z',
    channelTitle: 'channel',
    latestCapturedAt: '2026-04-28T10:10:00.000Z',
    latestChartOut: false,
    latestRank: 5,
    points: [
      {
        buyPoint: true,
        capturedAt: '2026-04-28T10:00:00.000Z',
        chartOut: false,
        rank: 10,
        runId: 1,
        sellPoint: false,
        viewCount: 100,
      },
      {
        buyPoint: false,
        capturedAt: '2026-04-28T10:10:00.000Z',
        chartOut: false,
        rank: 5,
        runId: 2,
        sellPoint: true,
        viewCount: 200,
      },
    ],
    positionId: 1,
    sellRank: 5,
    status: 'CLOSED',
    thumbnailUrl: 'thumb',
    title: 'title',
    videoId: 'video-1',
    ...overrides,
  } as GamePositionRankHistory;

  return history;
}

function createVideoHistory(overrides: Partial<VideoRankHistory> = {}): VideoRankHistory {
  const history = {
    categoryId: '0',
    categoryLabel: '전체',
    channelTitle: 'channel',
    latestCapturedAt: '2026-04-28T10:20:00.000Z',
    latestChartOut: false,
    latestRank: 3,
    points: [
      {
        capturedAt: '2026-04-28T10:05:00.000Z',
        chartOut: false,
        rank: 8,
        runId: 2,
        viewCount: 150,
      },
      {
        capturedAt: '2026-04-28T10:20:00.000Z',
        chartOut: false,
        rank: 3,
        runId: 3,
        viewCount: 300,
      },
    ],
    regionCode: 'KR',
    thumbnailUrl: 'thumb',
    title: 'video',
    videoId: 'video-1',
    ...overrides,
  } as VideoRankHistory;

  return history;
}

describe('mergeMultiplePositionHistories', () => {
  it('prepends video history points before the first trade point', () => {
    const merged = mergeMultiplePositionHistories(
      [createPositionHistory()],
      createVideoHistory({
        points: [
          {
            capturedAt: '2026-04-28T09:00:00.000Z',
            chartOut: false,
            rank: 20,
            runId: 0,
            viewCount: 50,
          },
          {
            capturedAt: '2026-04-28T10:20:00.000Z',
            chartOut: false,
            rank: 3,
            runId: 3,
            viewCount: 300,
          },
        ],
      }),
    );

    expect(merged?.points).toHaveLength(4);
    expect(merged?.points[0]).toMatchObject({
      buyPoint: false,
      capturedAt: '2026-04-28T09:00:00.000Z',
      rank: 20,
      sellPoint: false,
    });
  });

  it('appends trailing video history points after the last trade point', () => {
    const merged = mergeMultiplePositionHistories(
      [createPositionHistory()],
      createVideoHistory(),
    );

    expect(merged?.points).toHaveLength(3);
    expect(merged?.points.at(-1)).toMatchObject({
      buyPoint: false,
      capturedAt: '2026-04-28T10:20:00.000Z',
      rank: 3,
      sellPoint: false,
    });
  });
});
