do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_wallets'
  ) then
    alter publication supabase_realtime add table public.game_wallets;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_scheduled_sell_orders'
  ) then
    alter publication supabase_realtime add table public.game_scheduled_sell_orders;
  end if;
end
$$;
