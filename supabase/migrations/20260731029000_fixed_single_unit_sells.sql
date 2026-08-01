-- Keep exactly one unit per open video position and allow sells only as a full-position close.

with positions_to_normalize as (
  select
    id,
    season_id,
    user_id,
    greatest(0, round(stake_points::numeric * 100 / quantity)::bigint) as kept_stake_points,
    greatest(0, stake_points - round(stake_points::numeric * 100 / quantity)::bigint) as refund_points
  from public.game_positions
  where status = 'OPEN'
    and quantity > 100
),
wallet_refunds as (
  update public.game_wallets as wallet
  set
    balance_points = wallet.balance_points + refunds.refund_points,
    updated_at = now()
  from (
    select season_id, user_id, sum(refund_points)::bigint as refund_points
    from positions_to_normalize
    group by season_id, user_id
  ) as refunds
  where wallet.season_id = refunds.season_id
    and wallet.user_id = refunds.user_id
  returning wallet.id
)
update public.game_positions as position
set
  quantity = 100,
  stake_points = normalized.kept_stake_points
from positions_to_normalize as normalized
where position.id = normalized.id;

update public.game_scheduled_sell_orders as sell_order
set
  quantity = position.quantity,
  updated_at = now()
from public.game_positions as position
where sell_order.position_id = position.id
  and sell_order.status = 'PENDING'
  and sell_order.quantity <> position.quantity;

create or replace function public.enforce_full_position_sell()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'OPEN'
    and new.status = 'OPEN'
    and (
      new.quantity is distinct from old.quantity
      or new.stake_points is distinct from old.stake_points
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'partial_position_sell_disabled';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_full_position_sell() from public, anon, authenticated;

drop trigger if exists enforce_full_position_sell on public.game_positions;

create trigger enforce_full_position_sell
before update of quantity, stake_points on public.game_positions
for each row
execute function public.enforce_full_position_sell();

comment on function public.enforce_full_position_sell() is
  'Prevents partial reductions of an open game position; positions must be sold in full.';
