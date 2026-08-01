import { describe, expect, it } from 'vitest';
import {
  resolveNextTier,
  resolveTier,
  TIER_DEFINITIONS,
  type GameTierDefinition,
} from '../../../supabase/functions/_shared/game';

describe('asset point tier thresholds', () => {
  it('triples the progression gap for a three-month season', () => {
    expect(resolveTier(100_000).tierCode).toBe('BRONZE');
    expect(resolveNextTier(100_000)?.minScore).toBe(160_000);
    expect(resolveTier(159_999).tierCode).toBe('BRONZE');
    expect(resolveTier(160_000).tierCode).toBe('SILVER');
  });

  it('keeps the production defaults in sync with the tier migration', () => {
    expect(
      Object.fromEntries(TIER_DEFINITIONS.map((tier) => [tier.tierCode, tier.minScore])),
    ).toEqual({
      BRONZE: 0,
      DIAMOND: 700_000,
      GOLD: 250_000,
      LEGEND: 2_800_000,
      MASTER: 1_300_000,
      PLATINUM: 400_000,
      SILVER: 160_000,
    });
  });

  it('resolves tiers from an admin-provided threshold set', () => {
    const customTiers: GameTierDefinition[] = TIER_DEFINITIONS.map((tier, index) => ({
      ...tier,
      minScore: index * 10_000,
    }));

    expect(resolveTier(35_000, customTiers).tierCode).toBe('PLATINUM');
    expect(resolveNextTier(35_000, customTiers)?.tierCode).toBe('DIAMOND');
  });
});
