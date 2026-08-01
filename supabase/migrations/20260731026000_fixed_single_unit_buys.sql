create or replace function public.atlas_buy_position(
  target_user_id bigint,
  target_season_id bigint,
  target_region_code text,
  target_category_id text,
  target_video_id text,
  target_title text,
  target_channel_title text,
  target_thumbnail_url text,
  target_buy_rank integer,
  target_buy_captured_at timestamptz,
  target_stake_points bigint,
  target_quantity bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  target_wallet public.game_wallets%rowtype;
  target_season public.game_seasons%rowtype;
  open_position_count integer;
  created_position_id bigint;
  updated_signal_count integer;
begin
  if target_stake_points <= 0 or target_quantity <> 100 then
    raise exception using errcode = 'P0001', message = 'invalid_trade_quantity';
  end if;

  select *
  into target_season
  from public.game_seasons
  where id = target_season_id and status = 'ACTIVE'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'active_season_not_found';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      target_season.id::text || ':' || target_user_id::text || ':' || target_video_id,
      0
    )
  );

  if exists (
    select 1
    from public.game_positions
    where season_id = target_season.id
      and user_id = target_user_id
      and video_id = target_video_id
      and status = 'OPEN'
  ) then
    raise exception using errcode = 'P0001', message = 'video_already_owned';
  end if;

  insert into public.game_wallets (season_id, user_id, balance_points)
  values (target_season.id, target_user_id, target_season.starting_balance_points)
  on conflict (season_id, user_id) do nothing;

  select *
  into target_wallet
  from public.game_wallets
  where season_id = target_season.id and user_id = target_user_id
  for update;

  if target_wallet.balance_points < target_stake_points then
    raise exception using errcode = 'P0001', message = 'insufficient_balance';
  end if;

  select count(distinct video_id)
  into open_position_count
  from public.game_positions
  where season_id = target_season.id
    and user_id = target_user_id
    and status = 'OPEN';

  if open_position_count >= target_season.max_open_positions then
    raise exception using errcode = 'P0001', message = 'inventory_full';
  end if;

  update public.video_trend_signals
  set
    sync_buy_count = sync_buy_count + 1,
    sync_buy_quantity = sync_buy_quantity + target_quantity,
    updated_at = now()
  where region_code = upper(target_region_code)
    and video_id = target_video_id
    and captured_at = target_buy_captured_at;

  get diagnostics updated_signal_count = row_count;

  if updated_signal_count = 0 then
    raise exception using errcode = 'P0001', message = 'stale_market_price';
  end if;

  update public.game_wallets
  set
    balance_points = balance_points - target_stake_points,
    updated_at = now()
  where id = target_wallet.id;

  insert into public.game_positions (
    season_id,
    user_id,
    region_code,
    category_id,
    video_id,
    title,
    channel_title,
    thumbnail_url,
    buy_rank,
    quantity,
    stake_points,
    buy_captured_at
  )
  values (
    target_season.id,
    target_user_id,
    upper(target_region_code),
    target_category_id,
    target_video_id,
    target_title,
    target_channel_title,
    target_thumbnail_url,
    target_buy_rank,
    target_quantity,
    target_stake_points,
    target_buy_captured_at
  )
  returning id into created_position_id;

  insert into public.game_ledger (
    wallet_id,
    position_id,
    ledger_type,
    amount_points,
    balance_after_points,
    description
  )
  values (
    target_wallet.id,
    created_position_id,
    'BUY',
    -target_stake_points,
    target_wallet.balance_points - target_stake_points,
    target_video_id
  );

  return created_position_id;
end;
$$;

revoke all on function public.atlas_buy_position(
  bigint, bigint, text, text, text, text, text, text, integer, timestamptz, bigint, bigint
) from public, anon, authenticated;

grant execute on function public.atlas_buy_position(
  bigint, bigint, text, text, text, text, text, text, integer, timestamptz, bigint, bigint
) to service_role;
