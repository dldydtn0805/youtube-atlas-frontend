import { describe, expect, it } from 'vitest';
import type { TrendSignalRow } from '../../_shared/game';
import { gamePositionSignalMap, getGamePositionRegionCodes, getGamePositionSignal } from './game-position-signals';

function createSignal(regionCode: string, currentRank: number) {
  return {
    current_rank: currentRank,
    region_code: regionCode,
    video_id: 'shared-video',
  } as TrendSignalRow;
}

describe('game position signals', () => {
  it('keeps the same video separate when it appears in multiple countries', () => {
    const signals = gamePositionSignalMap([createSignal('KR', 3), createSignal('US', 19)]);

    expect(
      getGamePositionSignal(signals, {
        region_code: 'KR',
        video_id: 'shared-video',
      })?.current_rank,
    ).toBe(3);
    expect(
      getGamePositionSignal(signals, {
        region_code: 'us',
        video_id: 'shared-video',
      })?.current_rank,
    ).toBe(19);
  });

  it('returns each portfolio country once', () => {
    expect(getGamePositionRegionCodes([{ region_code: 'KR' }, { region_code: 'kr' }, { region_code: 'US' }])).toEqual([
      'KR',
      'US',
    ]);
  });
});
