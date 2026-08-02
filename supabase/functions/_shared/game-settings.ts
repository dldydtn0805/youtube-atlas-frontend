import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

export const FALLBACK_SCHEDULED_SELL_DEFAULT_PROFIT_RATE_PERCENT = 300;
export const FALLBACK_SCHEDULED_SELL_PROFIT_RATE_PRESETS = [300, 500, 1000];

interface GameSettingsRow {
  scheduled_sell_default_profit_rate_percent: number;
  scheduled_sell_profit_rate_presets: number[];
  updated_at: string;
  updated_by: string | null;
}

export interface GameSettings {
  scheduledSellDefaultProfitRatePercent: number;
  scheduledSellProfitRatePresets: number[];
  updatedAt: string | null;
  updatedBy: string | null;
}

const gameSettingsPromises = new WeakMap<
  SupabaseClient,
  Promise<GameSettings>
>();

function normalizeScheduledSellProfitRatePresets(value: unknown) {
  if (!Array.isArray(value) || value.length !== 3) {
    return [...FALLBACK_SCHEDULED_SELL_PROFIT_RATE_PRESETS];
  }

  const presets: number[] = [];
  for (const preset of value) {
    if (
      typeof preset !== "number" ||
      !Number.isFinite(preset) ||
      preset < 0 ||
      (presets.length > 0 && preset <= presets[presets.length - 1])
    ) {
      return [...FALLBACK_SCHEDULED_SELL_PROFIT_RATE_PRESETS];
    }
    presets.push(preset);
  }

  return presets;
}

async function fetchGameSettings(
  service: SupabaseClient,
): Promise<GameSettings> {
  const { data, error } = await service
    .from("game_settings")
    .select(
      "scheduled_sell_default_profit_rate_percent, scheduled_sell_profit_rate_presets, updated_at, updated_by",
    )
    .eq("id", 1)
    .maybeSingle<GameSettingsRow>();

  if (error) throw error;

  return {
    scheduledSellDefaultProfitRatePercent: Number(
      data?.scheduled_sell_default_profit_rate_percent ??
        FALLBACK_SCHEDULED_SELL_DEFAULT_PROFIT_RATE_PERCENT,
    ),
    scheduledSellProfitRatePresets: normalizeScheduledSellProfitRatePresets(
      data?.scheduled_sell_profit_rate_presets,
    ),
    updatedAt: data?.updated_at ?? null,
    updatedBy: data?.updated_by ?? null,
  };
}

export function loadGameSettings(service: SupabaseClient): Promise<GameSettings> {
  const cached = gameSettingsPromises.get(service);

  if (cached) {
    return cached;
  }

  const pending = fetchGameSettings(service);
  gameSettingsPromises.set(service, pending);
  void pending.catch(() => {
    if (gameSettingsPromises.get(service) === pending) {
      gameSettingsPromises.delete(service);
    }
  });

  return pending;
}
