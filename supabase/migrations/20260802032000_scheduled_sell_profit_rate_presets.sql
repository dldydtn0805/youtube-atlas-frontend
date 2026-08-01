alter table public.game_settings
  add column if not exists scheduled_sell_profit_rate_presets double precision[]
  not null default array[300::double precision, 500::double precision, 1000::double precision];

alter table public.game_settings
  drop constraint if exists game_settings_scheduled_sell_profit_rate_presets_check;

alter table public.game_settings
  add constraint game_settings_scheduled_sell_profit_rate_presets_check
  check (
    cardinality(scheduled_sell_profit_rate_presets) = 3
    and scheduled_sell_profit_rate_presets[1] >= 0
    and scheduled_sell_profit_rate_presets[2] > scheduled_sell_profit_rate_presets[1]
    and scheduled_sell_profit_rate_presets[3] > scheduled_sell_profit_rate_presets[2]
  );
