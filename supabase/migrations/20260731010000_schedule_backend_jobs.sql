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
      'atlas-sync-trending-br',
      'atlas-sync-trending-id',
      'atlas-settle-game',
      'atlas-retention'
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
      url := 'https://zmgstrqoxpmbzgjifjje.supabase.co/functions/v1/sync-trending',
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
      url := 'https://zmgstrqoxpmbzgjifjje.supabase.co/functions/v1/sync-trending',
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
      url := 'https://zmgstrqoxpmbzgjifjje.supabase.co/functions/v1/sync-trending',
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
  'atlas-sync-trending-br',
  '37 * * * *',
  $$
    select net.http_post(
      url := 'https://zmgstrqoxpmbzgjifjje.supabase.co/functions/v1/sync-trending',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'atlas_cron_secret'
          limit 1
        )
      ),
      body := '{"regionCode":"BR","categoryId":"0","categoryLabel":"전체","sourceCategoryIds":[]}'::jsonb
    );
  $$
);

select cron.schedule(
  'atlas-sync-trending-id',
  '47 * * * *',
  $$
    select net.http_post(
      url := 'https://zmgstrqoxpmbzgjifjje.supabase.co/functions/v1/sync-trending',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'atlas_cron_secret'
          limit 1
        )
      ),
      body := '{"regionCode":"ID","categoryId":"0","categoryLabel":"전체","sourceCategoryIds":[]}'::jsonb
    );
  $$
);

select cron.schedule(
  'atlas-settle-game',
  '*/5 * * * *',
  $$
    select net.http_post(
      url := 'https://zmgstrqoxpmbzgjifjje.supabase.co/functions/v1/settle-game',
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

select cron.schedule(
  'atlas-retention',
  '23 3 * * *',
  $$ select public.delete_expired_atlas_data(); $$
);
