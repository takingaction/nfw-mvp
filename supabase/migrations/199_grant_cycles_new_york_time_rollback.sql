-- Rollback for 199: restore UTC-date comparison and 05:00 UTC schedule
-- (the 2026-07-23 live version with search_path = pg_catalog, public).

CREATE OR REPLACE FUNCTION sync_grant_cycle_statuses()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE grant_cycles
  SET status = 'open'
  WHERE start_date::date <= CURRENT_DATE
    AND end_date::date >= CURRENT_DATE
    AND status = 'closed';

  UPDATE grant_cycles
  SET status = 'closed'
  WHERE end_date::date < CURRENT_DATE
    AND status = 'open';
END;
$$;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'sync-grant-cycle-statuses';

SELECT cron.schedule(
  'sync-grant-cycle-statuses',
  '0 5 * * *',
  'SELECT sync_grant_cycle_statuses()'
);

NOTIFY pgrst, 'reload';
