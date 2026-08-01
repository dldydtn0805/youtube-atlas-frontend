alter table public.video_trend_signals
  add column if not exists sync_sell_count integer not null default 0
    check (sync_sell_count >= 0),
  add column if not exists sync_sell_quantity bigint not null default 0
    check (sync_sell_quantity >= 0);

create or replace function public.atlas_sell_position(
  target_user_id bigint,
  target_position_id bigint,
  target_quantity bigint,
  target_sell_rank integer,
  target_unit_price_points bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_position public.game_positions%rowtype;
  target_wallet public.game_wallets%rowtype;
  target_signal public.video_trend_signals%rowtype;
  has_target_signal boolean := false;
  latest_region_sync_at timestamptz;
  sold_stake_points bigint;
  sell_price_points bigint;
  sell_fee_points bigint;
  settled_points bigint;
  pnl_points bigint;
  next_balance bigint;
  sold_at timestamptz := now();
begin
  select *
  into target_position
  from public.game_positions
  where id = target_position_id
    and user_id = target_user_id
    and status = 'OPEN'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'position_not_found';
  end if;

  if target_quantity <= 0 or target_quantity > target_position.quantity then
    raise exception using errcode = 'P0001', message = 'invalid_trade_quantity';
  end if;

  select *
  into target_signal
  from public.video_trend_signals
  where region_code = target_position.region_code
    and video_id = target_position.video_id
    and category_id in ('all', '0')
  order by captured_at desc
  limit 1
  for update;

  has_target_signal := found;

  if has_target_signal then
    if target_signal.captured_at <= target_position.buy_captured_at then
      raise exception using errcode = 'P0001', message = 'next_trend_sync_required';
    end if;
  else
    select max(captured_at)
    into latest_region_sync_at
    from public.video_trend_runs
    where region_code = target_position.region_code
      and category_id in ('all', '0');

    if latest_region_sync_at is null or latest_region_sync_at <= target_position.buy_captured_at then
      raise exception using errcode = 'P0001', message = 'next_trend_sync_required';
    end if;
  end if;

  if sold_at < target_position.created_at + (
    select make_interval(secs => min_hold_seconds)
    from public.game_seasons
    where id = target_position.season_id
  ) then
    raise exception using errcode = 'P0001', message = 'minimum_hold_not_reached';
  end if;

  select *
  into target_wallet
  from public.game_wallets
  where season_id = target_position.season_id
    and user_id = target_user_id
  for update;

  sold_stake_points := round(
    target_position.stake_points::numeric * target_quantity::numeric / target_position.quantity::numeric
  )::bigint;
  sell_price_points := round(
    greatest(0, target_unit_price_points)::numeric * target_quantity::numeric / 100::numeric
  )::bigint;
  sell_fee_points := floor(greatest(0, sell_price_points)::numeric * 3::numeric / 1000::numeric)::bigint;
  settled_points := greatest(0, sell_price_points - sell_fee_points);
  pnl_points := settled_points - sold_stake_points;
  next_balance := target_wallet.balance_points + settled_points;

  if has_target_signal then
    update public.video_trend_signals
    set
      sync_sell_count = sync_sell_count + 1,
      sync_sell_quantity = sync_sell_quantity + target_quantity,
      updated_at = sold_at
    where region_code = target_signal.region_code
      and category_id = target_signal.category_id
      and video_id = target_signal.video_id
      and captured_at = target_signal.captured_at;
  end if;

  if target_quantity = target_position.quantity then
    update public.game_positions
    set
      status = 'CLOSED',
      sell_rank = target_sell_rank,
      closed_at = sold_at
    where id = target_position.id;
  else
    update public.game_positions
    set
      quantity = quantity - target_quantity,
      stake_points = stake_points - sold_stake_points
    where id = target_position.id;

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
      sell_rank,
      quantity,
      stake_points,
      buy_captured_at,
      status,
      created_at,
      closed_at,
      origin_position_id
    )
    values (
      target_position.season_id,
      target_position.user_id,
      target_position.region_code,
      target_position.category_id,
      target_position.video_id,
      target_position.title,
      target_position.channel_title,
      target_position.thumbnail_url,
      target_position.buy_rank,
      target_sell_rank,
      target_quantity,
      sold_stake_points,
      target_position.buy_captured_at,
      'CLOSED',
      target_position.created_at,
      sold_at,
      target_position.id
    );
  end if;

  update public.game_wallets
  set
    balance_points = next_balance,
    realized_pnl_points = realized_pnl_points + pnl_points,
    updated_at = sold_at
  where id = target_wallet.id;

  update public.game_scheduled_sell_orders
  set
    status = 'CANCELED',
    canceled_at = sold_at,
    updated_at = sold_at
  where position_id = target_position.id
    and status = 'PENDING'
    and target_quantity = target_position.quantity;

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
    target_position.id,
    'SELL',
    settled_points,
    next_balance,
    target_position.video_id
  );

  return jsonb_build_object(
    'positionId', target_position.id,
    'videoId', target_position.video_id,
    'buyRank', target_position.buy_rank,
    'sellRank', target_sell_rank,
    'rankDiff', target_position.buy_rank - target_sell_rank,
    'quantity', target_quantity,
    'stakePoints', sold_stake_points,
    'sellPricePoints', sell_price_points,
    'pnlPoints', pnl_points,
    'settledPoints', settled_points,
    'highlightScore', greatest(0, (target_position.buy_rank - target_sell_rank) * 100),
    'balancePoints', next_balance,
    'soldAt', sold_at
  );
end;
$$;

revoke all on function public.atlas_sell_position(
  bigint, bigint, bigint, integer, bigint
) from public, anon, authenticated;

grant execute on function public.atlas_sell_position(
  bigint, bigint, bigint, integer, bigint
) to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'video_trend_signals'
  ) then
    alter publication supabase_realtime add table public.video_trend_signals;
  end if;
end
$$;
