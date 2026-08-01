import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

export const FALLBACK_SCHEDULED_SELL_DEFAULT_PROFIT_RATE_PERCENT = 300;

interface GameSettingsRow {
  scheduled_sell_default_profit_rate_percent: number;
  updated_at: string;
  updated_by: string | null;
}

export interface GameSettings {
  scheduledSellDefaultProfitRatePercent: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function loadGameSettings(
  service: SupabaseClient,
): Promise<GameSettings> {
  const { data, error } = await service
    .from("game_settings")
    .select(
      "scheduled_sell_default_profit_rate_percent, updated_at, updated_by",
    )
    .eq("id", 1)
    .maybeSingle<GameSettingsRow>();

  if (error) throw error;

  return {
    scheduledSellDefaultProfitRatePercent: Number(
      data?.scheduled_sell_default_profit_rate_percent ??
        FALLBACK_SCHEDULED_SELL_DEFAULT_PROFIT_RATE_PERCENT,
    ),
    updatedAt: data?.updated_at ?? null,
    updatedBy: data?.updated_by ?? null,
  };
}
