import { describe, expect, it } from 'vitest';
import { buildGameStrategyBadges, buildPositionStrategyBadges, resolveGameStrategyTags } from './gameStrategyTags';
import { getScheduledSellPresetForStrategy, getScheduledSellTargetRankForStrategy } from './scheduledSellStrategyPreset';

describe('gameStrategyTags', () => {
  it('keeps backend strategy order and builds highlight badges', () => {
    expect(buildGameStrategyBadges(['ATLAS_SHOT', 'GALAXY_SHOT', 'SOLAR_SHOT', 'MOONSHOT', 'SNIPE', 'BIG_CASHOUT'])).toEqual([
      { label: '아틀라스 샷', tone: 'atlas-shot', type: 'ATLAS_SHOT' },
      { label: '갤럭시 샷', tone: 'galaxy-shot', type: 'GALAXY_SHOT' },
      { label: '솔라 샷', tone: 'solar-shot', type: 'SOLAR_SHOT' },
      { label: '문샷', tone: 'moonshot', type: 'MOONSHOT' },
      { label: '스나이프', tone: 'snipe', type: 'SNIPE' },
      { label: '빅 캐시아웃', tone: 'cashout', type: 'BIG_CASHOUT' },
    ]);
  });

  it('uses position-specific labels for open position badges', () => {
    expect(buildGameStrategyBadges(['ATLAS_SHOT', 'GALAXY_SHOT', 'SOLAR_SHOT', 'SMALL_CASHOUT', 'SNIPE'], undefined, 'position')).toEqual([
      { label: '아틀라스 샷 노림', tone: 'atlas-shot', type: 'ATLAS_SHOT' },
      { label: '갤럭시 샷 노림', tone: 'galaxy-shot', type: 'GALAXY_SHOT' },
      { label: '솔라 샷 노림', tone: 'solar-shot', type: 'SOLAR_SHOT' },
      { label: '스몰 캐시아웃 노림', tone: 'cashout', type: 'SMALL_CASHOUT' },
      { label: '스나이프 노림', tone: 'snipe', type: 'SNIPE' },
    ]);
  });

  it('falls back to the representative highlight type when tags are absent', () => {
    expect(resolveGameStrategyTags(undefined, 'ATLAS_SHOT')).toEqual(['ATLAS_SHOT']);
  });

  it('builds achieved and target badges for open positions', () => {
    expect(buildPositionStrategyBadges(['ATLAS_SHOT', 'GALAXY_SHOT', 'SOLAR_SHOT', 'SMALL_CASHOUT'], ['BIG_CASHOUT', 'SNIPE'])).toEqual([
      { label: '아틀라스 샷 달성', tone: 'atlas-shot', type: 'ATLAS_SHOT', state: 'achieved' },
      { label: '갤럭시 샷 달성', tone: 'galaxy-shot', type: 'GALAXY_SHOT', state: 'achieved' },
      { label: '솔라 샷 달성', tone: 'solar-shot', type: 'SOLAR_SHOT', state: 'achieved' },
      { label: '스몰 캐시아웃 달성', tone: 'cashout', type: 'SMALL_CASHOUT', state: 'achieved' },
      { label: '빅 캐시아웃 노림', tone: 'cashout', type: 'BIG_CASHOUT', state: 'target' },
      { label: '스나이프 노림', tone: 'snipe', type: 'SNIPE', state: 'target' },
    ]);
  });

  it('maps strategy target badges to scheduled sell presets', () => {
    expect(getScheduledSellTargetRankForStrategy('SNIPE')).toBe(100);
    expect(getScheduledSellTargetRankForStrategy('MOONSHOT')).toBe(50);
    expect(getScheduledSellTargetRankForStrategy('SOLAR_SHOT')).toBe(20);
    expect(getScheduledSellTargetRankForStrategy('GALAXY_SHOT')).toBe(5);
    expect(getScheduledSellTargetRankForStrategy('ATLAS_SHOT')).toBe(1);
    expect(getScheduledSellTargetRankForStrategy('BIG_CASHOUT')).toBeNull();
  });

  it('maps cashout target badges to profit rate scheduled sell presets', () => {
    expect(getScheduledSellPresetForStrategy('SMALL_CASHOUT')).toEqual({
      targetProfitRatePercent: 300,
      targetRank: null,
      triggerType: 'PROFIT_RATE',
    });
    expect(getScheduledSellPresetForStrategy('BIG_CASHOUT')).toEqual({
      targetProfitRatePercent: 1000,
      targetRank: null,
      triggerType: 'PROFIT_RATE',
    });
  });
});
