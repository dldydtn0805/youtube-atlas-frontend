import { describe, expect, it } from 'vitest';
import { buildGameStrategyBadges, buildPositionStrategyBadges, resolveGameStrategyTags } from './gameStrategyTags';

describe('gameStrategyTags', () => {
  it('keeps backend strategy order and builds highlight badges', () => {
    expect(buildGameStrategyBadges(['ATLAS_SHOT', 'MOONSHOT', 'SNIPE', 'BIG_CASHOUT'])).toEqual([
      { label: '아틀라스 샷', tone: 'atlas-shot', type: 'ATLAS_SHOT' },
      { label: '문샷', tone: 'moonshot', type: 'MOONSHOT' },
      { label: '스나이프', tone: 'snipe', type: 'SNIPE' },
      { label: '빅 캐시아웃', tone: 'cashout', type: 'BIG_CASHOUT' },
    ]);
  });

  it('uses position-specific labels for open position badges', () => {
    expect(buildGameStrategyBadges(['ATLAS_SHOT', 'SMALL_CASHOUT', 'SNIPE'], undefined, 'position')).toEqual([
      { label: '아틀라스 샷 노림', tone: 'atlas-shot', type: 'ATLAS_SHOT' },
      { label: '스몰 캐시아웃 노림', tone: 'cashout', type: 'SMALL_CASHOUT' },
      { label: '스나이프 노림', tone: 'snipe', type: 'SNIPE' },
    ]);
  });

  it('falls back to the representative highlight type when tags are absent', () => {
    expect(resolveGameStrategyTags(undefined, 'ATLAS_SHOT')).toEqual(['ATLAS_SHOT']);
  });

  it('builds achieved and target badges for open positions', () => {
    expect(buildPositionStrategyBadges(['ATLAS_SHOT', 'SMALL_CASHOUT'], ['BIG_CASHOUT', 'SNIPE'])).toEqual([
      { label: '아틀라스 샷 달성', tone: 'atlas-shot', type: 'ATLAS_SHOT', state: 'achieved' },
      { label: '스몰 캐시아웃 달성', tone: 'cashout', type: 'SMALL_CASHOUT', state: 'achieved' },
      { label: '빅 캐시아웃 노림', tone: 'cashout', type: 'BIG_CASHOUT', state: 'target' },
      { label: '스나이프 노림', tone: 'snipe', type: 'SNIPE', state: 'target' },
    ]);
  });
});
