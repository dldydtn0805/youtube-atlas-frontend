import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';
import {
  TIER_DEFINITIONS,
  type GameTierDefinition,
} from './game.ts';

interface GameSeasonTierRow {
  badge_code: string;
  display_name: string;
  inventory_slots: number;
  min_score: number;
  profile_theme_code: string;
  sort_order: number;
  tier_code: string;
  title_code: string;
}

export async function loadSeasonTiers(
  service: SupabaseClient,
  seasonId: number,
): Promise<GameTierDefinition[]> {
  const { data, error } = await service
    .from('game_season_tiers')
    .select(
      'tier_code, display_name, min_score, badge_code, title_code, profile_theme_code, inventory_slots, sort_order',
    )
    .eq('season_id', seasonId)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as GameSeasonTierRow[];
  if (rows.length === 0) {
    return TIER_DEFINITIONS.map((tier) => ({ ...tier }));
  }

  return rows.map((tier) => ({
    badgeCode: tier.badge_code,
    displayName: tier.display_name,
    inventorySlots: tier.inventory_slots,
    minScore: Number(tier.min_score),
    profileThemeCode: tier.profile_theme_code,
    tierCode: tier.tier_code,
    titleCode: tier.title_code,
  }));
}
