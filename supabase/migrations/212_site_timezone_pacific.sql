-- Migration 212: The whole site runs on Pacific Time (America/Los_Angeles).
--
-- Replaces the New York logic from migration 199. Cycles now accept
-- applications from 12:00 AM PT on start_date through 11:59:59 PM PT on
-- end_date. The app mirrors this with SITE_TZ / siteToday() in lib/dates.ts
-- (and mobile/lib/format.ts); lib/grant-eligibility.ts still enforces
-- end_date at submission time, so this cron only keeps the status column
-- in sync for display/admin purposes.
--
-- The DB itself stays on UTC. start_date / end_date are date-only markers
-- stored as midnight UTC, so they are read with an explicit UTC cast.
--
-- Schedule: 07:00 and 08:00 UTC. 07:00 UTC = midnight PDT, 08:00 UTC =
-- midnight PST. Whichever run is not at midnight is a harmless no-op.

-- Single source of truth for the site time zone inside the database.
CREATE OR REPLACE FUNCTION public.site_tz()
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$ SELECT 'America/Los_Angeles'::text $$;

CREATE OR REPLACE FUNCTION public.sync_grant_cycle_statuses()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  site_today date := (now() AT TIME ZONE public.site_tz())::date;
BEGIN
  -- Open cycles whose window includes today (Pacific)
  UPDATE grant_cycles
  SET status = 'open'
  WHERE (start_date AT TIME ZONE 'UTC')::date <= site_today
    AND (end_date AT TIME ZONE 'UTC')::date >= site_today
    AND status = 'closed';

  -- Close cycles whose end_date is before today (Pacific)
  UPDATE grant_cycles
  SET status = 'closed'
  WHERE (end_date AT TIME ZONE 'UTC')::date < site_today
    AND status = 'open';
END;
$$;

-- Reschedule (unschedule is a no-op-safe lookup by name)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'sync-grant-cycle-statuses';

SELECT cron.schedule(
  'sync-grant-cycle-statuses',
  '0 7,8 * * *',
  'SELECT sync_grant_cycle_statuses()'
);

NOTIFY pgrst, 'reload';
