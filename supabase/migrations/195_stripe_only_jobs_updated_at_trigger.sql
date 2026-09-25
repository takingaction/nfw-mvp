-- Migration: 195_stripe_only_jobs_updated_at_trigger
-- stripe_only_jobs was the only job-table without an updated_at
-- trigger. The cron worker was correctly checkpointing
-- processed_count every tick, but updated_at stayed at created_at
-- (00:00:00 delta observed across all rows). As a result, the
-- 30-min stale-cleanup at /api/cron/process-stripe-only-jobs/route.ts
-- marked every job as "Job timed out" exactly 30 min after creation,
-- regardless of how much work it had actually done. This produced
-- 88+ failed rows all with processed_count = 1250 (= 25 successful
-- ticks * 50 customers/tick).
--
-- Reuses the shared touch_updated_at() function defined in
-- migration 076_fix_search_path_for_functions.sql (already pinned
-- to pg_catalog so search_path is explicit and immutable).

DROP TRIGGER IF EXISTS trg_touch_stripe_only_jobs_updated_at ON stripe_only_jobs;

CREATE TRIGGER trg_touch_stripe_only_jobs_updated_at
  BEFORE UPDATE ON stripe_only_jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

NOTIFY pgrst, 'reload';
