import { describe, expect, it } from 'vitest';
import type { TrendSignalRow } from '../../_shared/game.ts';
import { filterTopSignalsByVideoCategory } from './public.ts';

function createSignal(
  currentRank: number,
  videoCategoryId: string,
): TrendSignalRow {
  return {
    captured_at: '2026-07-31T00:00:00.000Z',
    category_id: '0',
    category_label: '전체',
    channel_title: `채널 ${currentRank}`,
    current_rank: currentRank,
    current_view_count: currentRank * 1_000,
    is_new: false,
    previous_rank: currentRank + 1,
    previous_view_count: null,
    rank_change: 1,
    region_code: 'KR',
    sync_buy_count: 0,
    sync_buy_quantity: 0,
    sync_sell_count: 0,
    sync_sell_quantity: 0,
    thumbnail_url: `https://example.com/${currentRank}.jpg`,
    title: `영상 ${currentRank}`,
    video_category_id: videoCategoryId,
    video_id: `video-${currentRank}`,
    view_count_delta: null,
  };
}

describe('filterTopSignalsByVideoCategory', () => {
  const topSignals = [
    createSignal(1, '24'),
    createSignal(2, '10'),
    createSignal(3, '20'),
    createSignal(7, '10'),
  ];

  it('selects music from the synced TOP 200 and preserves its original ranks', () => {
    const musicSignals = filterTopSignalsByVideoCategory(topSignals, '10');

    expect(musicSignals.map((signal) => signal.video_id)).toEqual([
      'video-2',
      'video-7',
    ]);
    expect(musicSignals.map((signal) => signal.current_rank)).toEqual([2, 7]);
    expect(musicSignals.every((signal) => signal.category_id === '0')).toBe(
      true,
    );
  });

  it('filters every detail category by the YouTube category saved during trend sync', () => {
    expect(
      filterTopSignalsByVideoCategory(topSignals, '20').map(
        (signal) => signal.current_rank,
      ),
    ).toEqual([3]);
  });

  it('keeps the complete synced chart for the all category', () => {
    expect(filterTopSignalsByVideoCategory(topSignals, '0')).toEqual(
      topSignals,
    );
  });
});
