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
    (target_season_id, 'SILVER', '실버', 160000, 'season-silver', 'silver-investor', 'silver', 7, 2),
    (target_season_id, 'GOLD', '골드', 250000, 'season-gold', 'gold-investor', 'gold', 10, 3),
    (target_season_id, 'PLATINUM', '플래티넘', 400000, 'season-platinum', 'platinum-investor', 'platinum', 12, 4),
    (target_season_id, 'DIAMOND', '다이아몬드', 700000, 'season-diamond', 'diamond-investor', 'diamond', 15, 5),
    (target_season_id, 'MASTER', '마스터', 1300000, 'season-master', 'master-investor', 'master', 17, 6),
    (target_season_id, 'LEGEND', '레전드', 2800000, 'season-legend', 'legend-investor', 'legend', 20, 7)
  on conflict (season_id, tier_code) do nothing;
$$;

update public.game_season_tiers as tier
set min_score = case tier.tier_code
  when 'BRONZE' then 0
  when 'SILVER' then 160000
  when 'GOLD' then 250000
  when 'PLATINUM' then 400000
  when 'DIAMOND' then 700000
  when 'MASTER' then 1300000
  when 'LEGEND' then 2800000
  else tier.min_score
end
from public.game_seasons as season
where season.id = tier.season_id
  and season.status = 'ACTIVE';

do $$
declare
  current_month integer := extract(month from timezone('UTC', now()))::integer;
  current_year integer := extract(year from timezone('UTC', now()))::integer;
  season_end_at timestamptz;
  season_label text;
  season_start_at timestamptz;
  season_year integer;
begin
  if current_month between 3 and 5 then
    season_label := '봄';
    season_year := current_year;
    season_start_at := make_timestamptz(current_year, 3, 1, 0, 0, 0, 'UTC');
    season_end_at := make_timestamptz(current_year, 6, 1, 0, 0, 0, 'UTC');
  elsif current_month between 6 and 8 then
    season_label := '여름';
    season_year := current_year;
    season_start_at := make_timestamptz(current_year, 6, 1, 0, 0, 0, 'UTC');
    season_end_at := make_timestamptz(current_year, 9, 1, 0, 0, 0, 'UTC');
  elsif current_month between 9 and 11 then
    season_label := '가을';
    season_year := current_year;
    season_start_at := make_timestamptz(current_year, 9, 1, 0, 0, 0, 'UTC');
    season_end_at := make_timestamptz(current_year, 12, 1, 0, 0, 0, 'UTC');
  else
    season_label := '겨울';
    season_year := case when current_month = 12 then current_year else current_year - 1 end;
    season_start_at := make_timestamptz(season_year, 12, 1, 0, 0, 0, 'UTC');
    season_end_at := make_timestamptz(season_year + 1, 3, 1, 0, 0, 0, 'UTC');
  end if;

  update public.game_seasons
  set
    name = season_year::text || ' ' || season_label || ' 시즌',
    start_at = season_start_at,
    end_at = season_end_at
  where status = 'ACTIVE';
end
$$;

alter table public.game_seasons
  alter column end_at set default (now() + interval '3 months');

revoke all on function public.seed_game_tiers(bigint) from public, anon, authenticated;
grant execute on function public.seed_game_tiers(bigint) to service_role;
