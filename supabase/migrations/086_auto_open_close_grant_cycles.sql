-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to sync grant cycle statuses based on EST dates
CREATE OR REPLACE FUNCTION sync_grant_cycle_statuses()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  -- Open cycles where start_date has arrived and end_date hasn't passed
  UPDATE grant_cycles
  SET status = 'open'
  WHERE start_date::date <= CURRENT_DATE
    AND end_date::date >= CURRENT_DATE
    AND status = 'closed';

  -- Close cycles where end_date has passed
  -- Using ::date comparison to handle midnight UTC edge cases
  UPDATE grant_cycles
  SET status = 'closed'
  WHERE end_date::date < CURRENT_DATE
    AND status = 'open';
END;
$$;

-- Schedule job to run daily at 5 AM UTC = midnight EST
SELECT cron.schedule(
  'sync-grant-cycle-statuses',
  '0 5 * * *',
  'SELECT sync_grant_cycle_statuses()'
);
