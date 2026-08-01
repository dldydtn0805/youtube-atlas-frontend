-- Merge the country-scoped active games into one global game while keeping each
-- position's region_code as the market that supplies its rank and price.

drop trigger if exists game_positions_one_open_video_update on public.game_positions;

do $$
declare
  global_season_id bigint;
  source_season public.game_seasons%rowtype;
begin
  select season.*
  into source_season
  from public.game_seasons as season
  where season.status = 'ACTIVE'
    and season.region_code <> 'GLOBAL'
  order by
    case when season.region_code = 'KR' then 0 else 1 end,
    season.id
  limit 1;

  select season.id
  into global_season_id
  from public.game_seasons as season
  where season.status = 'ACTIVE'
    and season.region_code = 'GLOBAL'
  limit 1;

  if global_season_id is null and source_season.id is not null then
    insert into public.game_seasons (
      name,
      status,
      region_code,
      starting_balance_points,
      min_hold_seconds,
      max_open_positions,
      rank_point_multiplier,
      start_at,
      end_at
    )
    values (
      source_season.name,
      'ACTIVE',
      'GLOBAL',
      source_season.starting_balance_points,
      source_season.min_hold_seconds,
      source_season.max_open_positions,
      source_season.rank_point_multiplier,
      source_season.start_at,
      source_season.end_at
    )
    returning id into global_season_id;
  end if;

  if global_season_id is null then
    return;
  end if;

  perform public.seed_game_tiers(global_season_id);

  if source_season.id is not null then
    update public.game_season_tiers as target
    set
      badge_code = source.badge_code,
      display_name = source.display_name,
      inventory_slots = source.inventory_slots,
      min_score = source.min_score,
      profile_theme_code = source.profile_theme_code,
      sort_order = source.sort_order,
      title_code = source.title_code
    from public.game_season_tiers as source
    where target.season_id = global_season_id
      and source.season_id = source_season.id
      and source.tier_code = target.tier_code;
  end if;

  insert into public.game_wallets (
    season_id,
    user_id,
    balance_points,
    reserved_points,
    realized_pnl_points,
    manual_tier_score_adjustment
  )
  select
    global_season_id,
    wallet.user_id,
    greatest(
      0,
      global_season.starting_balance_points
        + sum(wallet.balance_points - wallet_season.starting_balance_points)
    )::bigint,
    sum(wallet.reserved_points)::bigint,
    sum(wallet.realized_pnl_points)::bigint,
    sum(wallet.manual_tier_score_adjustment)::bigint
  from public.game_wallets as wallet
  join public.game_seasons as wallet_season
    on wallet_season.id = wallet.season_id
  join public.game_seasons as global_season
    on global_season.id = global_season_id
  where wallet_season.status = 'ACTIVE'
  group by wallet.user_id, global_season.starting_balance_points
  on conflict (season_id, user_id) do update
  set
    balance_points = excluded.balance_points,
    manual_tier_score_adjustment = excluded.manual_tier_score_adjustment,
    realized_pnl_points = excluded.realized_pnl_points,
    reserved_points = excluded.reserved_points,
    updated_at = now();

  update public.game_ledger as ledger
  set wallet_id = global_wallet.id
  from public.game_wallets as old_wallet
  join public.game_seasons as old_season
    on old_season.id = old_wallet.season_id
  join public.game_wallets as global_wallet
    on global_wallet.season_id = global_season_id
    and global_wallet.user_id = old_wallet.user_id
  where ledger.wallet_id = old_wallet.id
    and old_season.status = 'ACTIVE'
    and old_wallet.season_id <> global_season_id;

  update public.game_positions
  set season_id = global_season_id
  where season_id in (
    select id
    from public.game_seasons
    where status = 'ACTIVE'
      and region_code <> 'GLOBAL'
  );

  update public.game_scheduled_sell_orders
  set season_id = global_season_id,
      updated_at = now()
  where season_id in (
    select id
    from public.game_seasons
    where status = 'ACTIVE'
      and region_code <> 'GLOBAL'
  );

  update public.game_notifications
  set season_id = global_season_id
  where season_id in (
    select id
    from public.game_seasons
    where status = 'ACTIVE'
      and region_code <> 'GLOBAL'
  );

  update public.game_highlights
  set season_id = global_season_id
  where season_id in (
    select id
    from public.game_seasons
    where status = 'ACTIVE'
      and region_code <> 'GLOBAL'
  );

  delete from public.game_wallets as wallet
  using public.game_seasons as season
  where wallet.season_id = season.id
    and season.status = 'ACTIVE'
    and season.region_code <> 'GLOBAL';

  update public.game_seasons
  set status = 'CLOSED'
  where status = 'ACTIVE'
    and region_code <> 'GLOBAL';
end
$$;

create trigger game_positions_one_open_video_update
before update of season_id, user_id, video_id, status on public.game_positions
for each row execute function public.enforce_one_open_position_per_video();

comment on column public.game_seasons.region_code is
  'Game scope. Active seasons use GLOBAL; position region_code remains the source chart market.';
