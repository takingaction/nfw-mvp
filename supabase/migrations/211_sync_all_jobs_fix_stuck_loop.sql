-- 211: stop the sync-all cron from re-reading every profile every 5 minutes.
--
-- Job 9b21f88d (created 2026-09-10) has sat in status=processing, phase
-- "pending" ever since. Every 5-minute tick of /api/cron/process-sync-all-jobs:
--   1. tries to mark it stale with `error: ...` -> 400, there is no `error` column
--   2. picks it up, loads all ~22k profiles (23 paged requests)
--   3. tries to save phase 2 with `progress: ...`  -> 400, there is no `progress` column
-- so it never advances and repeats ~288 times a day. The admin "Sync all"
-- button also just returns this stuck job.
--
-- Order matters: fail the stuck job FIRST. Once `progress` exists the phase
-- update would succeed and a 6-week-old job would start writing payments.

UPDATE sync_all_jobs
SET status = 'failed',
    error_message = 'Stuck since 2026-09-10: phase updates failed (missing progress/error columns). Closed by migration 211.',
    completed_at = now()
WHERE status IN ('pending', 'processing')
  AND created_at < now() - interval '1 day';

-- The worker and the admin BackfillClient both use `progress` for status text.
ALTER TABLE sync_all_jobs ADD COLUMN IF NOT EXISTS progress text;

-- Same fix as 195 did for stripe_only_jobs: without this, updated_at never
-- moves and the 30-min stale check would kill a healthy job at minute 30.
DROP TRIGGER IF EXISTS trg_touch_sync_all_jobs_updated_at ON sync_all_jobs;
CREATE TRIGGER trg_touch_sync_all_jobs_updated_at
  BEFORE UPDATE ON sync_all_jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

NOTIFY pgrst, 'reload';
