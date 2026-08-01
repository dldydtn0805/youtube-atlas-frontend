do $$
declare
  scheduled_job record;
begin
  for scheduled_job in
    select jobid
    from cron.job
    where jobname in (
      'atlas-sync-trending-br',
      'atlas-sync-trending-id'
    )
  loop
    perform cron.unschedule(scheduled_job.jobid);
  end loop;
end
$$;
