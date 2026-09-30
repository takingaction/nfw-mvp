-- Migration 199: Grant cycles open/close on New York calendar dates.
--
-- Cycles accept applications from 12:00 AM ET on start_date through
-- 11:59:59 PM ET on end_date. Previously this function compared against
-- CURRENT_DATE (UTC) and ran once at 05:00 UTC, so:
--   * cycles opened ~1 AM ET (EDT) and closed ~1 AM ET the day after end_date
--   * the app's own "today" checks used UTC, hiding cycles at 8 PM ET
-- The app now uses New York dates everywhere and enforces end_date at
-- submission time (lib/grant-eligibility.ts isPastEndDate), so this cron
-- only keeps the status column in sync for display/admin purposes.
--
-- Schedule: 04:00 and 05:00 UTC. 04:00 UTC = midnight EDT, 05:00 UTC =
-- midnight EST. Whichever run is not at midnight is a harmless no-op.

CREATE OR REPLACE FUNCTION sync_grant_cycle_statuses()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  ny_today date := (now() AT TIME ZONE 'America/New_York')::date;
BEGIN
  -- Open cycles whose window includes today (New York)
  UPDATE grant_cycles
  SET status = 'open'
  WHERE start_date::date <= ny_today
    AND end_date::date >= ny_today
    AND status = 'closed';

  -- Close cycles whose end_date is before today (New York)
  UPDATE grant_cycles
  SET status = 'closed'
  WHERE end_date::date < ny_today
    AND status = 'open';
END;
$$;

-- Reschedule (unschedule is a no-op-safe lookup by name)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'sync-grant-cycle-statuses';

SELECT cron.schedule(
  'sync-grant-cycle-statuses',
  '0 4,5 * * *',
  'SELECT sync_grant_cycle_statuses()'
);

NOTIFY pgrst, 'reload';
