create or replace function public.seed_game_tiers(target_season_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.game_season_tiers (
    season_id,
    tier_code,
    display_name,
    min_score,
    badge_code,
    title_code,
    profile_theme_code,
    inventory_slots,
    sort_order
  )
  values
    (target_season_id, 'BRONZE', '브론즈', 0, 'season-bronze', 'bronze-investor', 'bronze', 5, 1),
    (target_season_id, 'SILVER', '실버', 120000, 'season-silver', 'silver-investor', 'silver', 7, 2),
    (target_season_id, 'GOLD', '골드', 150000, 'season-gold', 'gold-investor', 'gold', 10, 3),
    (target_season_id, 'PLATINUM', '플래티넘', 200000, 'season-platinum', 'platinum-investor', 'platinum', 12, 4),
    (target_season_id, 'DIAMOND', '다이아몬드', 300000, 'season-diamond', 'diamond-investor', 'diamond', 15, 5),
    (target_season_id, 'MASTER', '마스터', 500000, 'season-master', 'master-investor', 'master', 17, 6),
    (target_season_id, 'LEGEND', '레전드', 1000000, 'season-legend', 'legend-investor', 'legend', 20, 7)
  on conflict (season_id, tier_code) do nothing;
$$;

update public.game_season_tiers as tier
set min_score = case tier.tier_code
  when 'BRONZE' then 0
  when 'SILVER' then 120000
  when 'GOLD' then 150000
  when 'PLATINUM' then 200000
  when 'DIAMOND' then 300000
  when 'MASTER' then 500000
  when 'LEGEND' then 1000000
  else tier.min_score
end
from public.game_seasons as season
where season.id = tier.season_id
  and season.status = 'ACTIVE';

revoke all on function public.seed_game_tiers(bigint) from public, anon, authenticated;
grant execute on function public.seed_game_tiers(bigint) to service_role;
