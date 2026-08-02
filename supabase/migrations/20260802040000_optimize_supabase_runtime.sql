alter table public.video_trend_runs
  add column if not exists completed_at timestamptz;

update public.video_trend_runs
set completed_at = captured_at
where completed_at is null;

drop policy if exists "Public trend runs are readable" on public.video_trend_runs;
create policy "Public trend runs are readable"
  on public.video_trend_runs for select
  using (true);

grant select on public.video_trend_runs to anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'video_trend_signals'
  ) then
    alter publication supabase_realtime drop table public.video_trend_signals;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'video_trend_runs'
  ) then
    alter publication supabase_realtime add table public.video_trend_runs;
  end if;
end
$$;

alter table public.video_trend_snapshots set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

alter table public.video_trend_signals set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

do $$
declare
  scheduled_job record;
begin
  for scheduled_job in
    select jobid
    from cron.job
    where jobname in (
      'atlas-sync-trending-kr',
      'atlas-sync-trending-us',
      'atlas-sync-trending-jp',
      'atlas-settle-game'
    )
  loop
    perform cron.unschedule(scheduled_job.jobid);
  end loop;
end
$$;

select cron.schedule(
  'atlas-sync-trending-kr',
  '7 * * * *',
  $$
    select net.http_post(
      url := 'https://zmgstrqoxpmbzgjifjje.supabase.co/functions/v1/sync-trending?forceFunctionRegion=ap-northeast-1',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'atlas_cron_secret'
          limit 1
        )
      ),
      body := '{"regionCode":"KR","categoryId":"0","categoryLabel":"전체","sourceCategoryIds":[]}'::jsonb
    );
  $$
);

select cron.schedule(
  'atlas-sync-trending-us',
  '17 * * * *',
  $$
    select net.http_post(
      url := 'https://zmgstrqoxpmbzgjifjje.supabase.co/functions/v1/sync-trending?forceFunctionRegion=ap-northeast-1',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'atlas_cron_secret'
          limit 1
        )
      ),
      body := '{"regionCode":"US","categoryId":"0","categoryLabel":"전체","sourceCategoryIds":[]}'::jsonb
    );
  $$
);

select cron.schedule(
  'atlas-sync-trending-jp',
  '27 * * * *',
  $$
    select net.http_post(
      url := 'https://zmgstrqoxpmbzgjifjje.supabase.co/functions/v1/sync-trending?forceFunctionRegion=ap-northeast-1',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'atlas_cron_secret'
          limit 1
        )
      ),
      body := '{"regionCode":"JP","categoryId":"0","categoryLabel":"전체","sourceCategoryIds":[]}'::jsonb
    );
  $$
);

select cron.schedule(
  'atlas-settle-game',
  '*/5 * * * *',
  $$
    select net.http_post(
      url := 'https://zmgstrqoxpmbzgjifjje.supabase.co/functions/v1/settle-game?forceFunctionRegion=ap-northeast-1',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'atlas_cron_secret'
          limit 1
        )
      ),
      body := '{}'::jsonb
    );
  $$
);
