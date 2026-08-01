import { describe, expect, it } from 'vitest';
import {
  resolveNextTier,
  resolveTier,
  TIER_DEFINITIONS,
  type GameTierDefinition,
} from '../../../supabase/functions/_shared/game';

describe('asset point tier thresholds', () => {
  it('keeps a new 100,000P wallet in Bronze until it reaches 120,000P', () => {
    expect(resolveTier(100_000).tierCode).toBe('BRONZE');
    expect(resolveNextTier(100_000)?.minScore).toBe(120_000);
    expect(resolveTier(120_000).tierCode).toBe('SILVER');
  });

  it('keeps the production defaults in sync with the tier migration', () => {
    expect(
      Object.fromEntries(TIER_DEFINITIONS.map((tier) => [tier.tierCode, tier.minScore])),
    ).toEqual({
      BRONZE: 0,
      DIAMOND: 300_000,
      GOLD: 150_000,
      LEGEND: 1_000_000,
      MASTER: 500_000,
      PLATINUM: 200_000,
      SILVER: 120_000,
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
