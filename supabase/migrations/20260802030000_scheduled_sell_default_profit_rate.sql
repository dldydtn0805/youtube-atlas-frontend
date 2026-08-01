create table if not exists public.game_settings (
  id smallint primary key default 1 check (id = 1),
  scheduled_sell_default_profit_rate_percent double precision not null default 300
    check (scheduled_sell_default_profit_rate_percent >= 0),
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.game_settings (
  id,
  scheduled_sell_default_profit_rate_percent
)
values (1, 300)
on conflict (id) do nothing;

alter table public.game_settings enable row level security;

revoke all on table public.game_settings from anon, authenticated;
