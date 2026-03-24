import { describe, expect, it } from 'vitest';
import { formatCompactCount, getVideoTrendBadges } from './presentation';

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

  it('shows rank gain and large view delta badges together', () => {
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
        label: '+8',
        tone: 'up',
      },
      {
        label: '조회수 +20만',
        tone: 'views',
      },
    ]);
  });

  it('shows a view badge starting from a 5만 increase', () => {
    expect(
      getVideoTrendBadges({
        categoryId: '0',
        categoryLabel: '전체',
        capturedAt: '2026-03-24T00:00:00.000Z',
        currentRank: 8,
        currentViewCount: 850_000,
        isNew: false,
        previousRank: 8,
        previousViewCount: 800_000,
        rankChange: 0,
        regionCode: 'KR',
        videoId: 'video-3',
        viewCountDelta: 50_000,
      }),
    ).toEqual([
      {
        label: '조회수 +5만',
        tone: 'views',
      },
    ]);
  });

  it('formats compact counts for Korean labels', () => {
    expect(formatCompactCount(950)).toBe('950');
    expect(formatCompactCount(8_500)).toBe('8.5천');
    expect(formatCompactCount(125_000)).toBe('13만');
  });
});
