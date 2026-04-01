import { describe, expect, it } from 'vitest';
import {
  formatCompactCount,
  getVideoTrendBadges,
  isRealtimeSurgingSignal,
  REALTIME_SURGING_RANK_CHANGE_THRESHOLD,
} from './presentation';

describe('trend presentation helpers', () => {
  it('returns a new badge before any other signal', () => {
    expect(
      getVideoTrendBadges({
        categoryId: 'gaming',
        categoryLabel: '게임',
        capturedAt: '2026-03-24T00:00:00.000Z',
        currentRank: 4,
        currentViewCount: 1_500_000,
        isNew: true,
        previousRank: null,
        previousViewCount: null,
        rankChange: null,
        regionCode: 'KR',
        videoId: 'video-1',
        viewCountDelta: null,
      }),
    ).toEqual([
      {
        label: 'NEW',
        tone: 'new',
      },
    ]);
  });

  it('shows an up badge when the rank rises', () => {
    expect(
      getVideoTrendBadges({
        categoryId: 'gaming',
        categoryLabel: '게임',
        capturedAt: '2026-03-24T00:00:00.000Z',
        currentRank: 3,
        currentViewCount: 1_900_000,
        isNew: false,
        previousRank: 11,
        previousViewCount: 1_700_000,
        rankChange: 8,
        regionCode: 'KR',
        videoId: 'video-2',
        viewCountDelta: 200_000,
      }),
    ).toEqual([
      {
        label: '▲ 8',
        tone: 'up',
      },
    ]);
  });

  it('shows only new when there is no previous rank to compare', () => {
    expect(
      getVideoTrendBadges({
        categoryId: '0',
        categoryLabel: '전체',
        capturedAt: '2026-03-24T00:00:00.000Z',
        currentRank: 8,
        currentViewCount: 801_000,
        isNew: true,
        previousRank: null,
        previousViewCount: 800_000,
        rankChange: null,
        regionCode: 'KR',
        videoId: 'video-3',
        viewCountDelta: 1_000,
      }),
    ).toEqual([
      {
        label: 'NEW',
        tone: 'new',
      },
    ]);
  });

  it('shows a steady badge when the rank did not change', () => {
    expect(
      getVideoTrendBadges({
        categoryId: '0',
        categoryLabel: '전체',
        capturedAt: '2026-03-24T00:00:00.000Z',
        currentRank: 8,
        currentViewCount: 801_000,
        isNew: false,
        previousRank: 8,
        previousViewCount: 800_000,
        rankChange: 0,
        regionCode: 'KR',
        videoId: 'video-steady',
        viewCountDelta: 1_000,
      }),
    ).toEqual([
      {
        label: '• 유지',
        tone: 'steady',
      },
    ]);
  });

  it('shows a rank drop badge when a video falls in the chart', () => {
    expect(
      getVideoTrendBadges({
        categoryId: 'music',
        categoryLabel: '음악',
        capturedAt: '2026-03-24T00:00:00.000Z',
        currentRank: 15,
        currentViewCount: 420_000,
        isNew: false,
        previousRank: 9,
        previousViewCount: 415_000,
        rankChange: -6,
        regionCode: 'KR',
        videoId: 'video-drop',
        viewCountDelta: 5_000,
      }),
    ).toEqual([
      {
        label: '▼ 6',
        tone: 'down',
      },
    ]);
  });

  it('keeps new and rank badges together', () => {
    expect(
      getVideoTrendBadges({
        categoryId: '0',
        categoryLabel: '전체',
        capturedAt: '2026-03-24T00:00:00.000Z',
        currentRank: 4,
        currentViewCount: 250_000,
        isNew: true,
        previousRank: 7,
        previousViewCount: 245_000,
        rankChange: 3,
        regionCode: 'KR',
        videoId: 'video-6',
        viewCountDelta: 5_000,
      }),
    ).toEqual([
      {
        label: 'NEW',
        tone: 'new',
      },
      {
        label: '▲ 3',
        tone: 'up',
      },
    ]);
  });

  it('formats compact counts for Korean labels', () => {
    expect(formatCompactCount(950)).toBe('950');
    expect(formatCompactCount(8_500)).toBe('8.5천');
    expect(formatCompactCount(125_000)).toBe('13만');
  });

  it('treats rank gains of five or more as realtime surging', () => {
    expect(
      isRealtimeSurgingSignal({
        categoryId: '0',
        categoryLabel: '전체',
        capturedAt: '2026-03-24T00:00:00.000Z',
        currentRank: 12,
        currentViewCount: 500_000,
        isNew: false,
        previousRank: 17,
        previousViewCount: 450_000,
        rankChange: REALTIME_SURGING_RANK_CHANGE_THRESHOLD,
        regionCode: 'KR',
        videoId: 'video-4',
        viewCountDelta: 50_000,
      }),
    ).toBe(true);

    expect(
      isRealtimeSurgingSignal({
        categoryId: '0',
        categoryLabel: '전체',
        capturedAt: '2026-03-24T00:00:00.000Z',
        currentRank: 12,
        currentViewCount: 500_000,
        isNew: false,
        previousRank: 16,
        previousViewCount: 450_000,
        rankChange: REALTIME_SURGING_RANK_CHANGE_THRESHOLD - 1,
        regionCode: 'KR',
        videoId: 'video-5',
        viewCountDelta: 50_000,
      }),
    ).toBe(false);
  });
});
