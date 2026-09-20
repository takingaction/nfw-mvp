-- Migration: 175_recover_timed_out_grants.sql
-- One-shot data recovery for grants stuck at ai_relevance='uncertain' +
-- ai_reasoning='AI evaluation timed out' from before the 2026-09-20 fix
-- (lib/anthropic.ts bump to 18s + ai-reevaluate cron rewrite).
--
-- Run AFTER:
--   1. Migrations 175 + 176 have been applied (ai_reevaluate_jobs and
--      ai_backfill_jobs tables exist)
--   2. The cron workers are deployed (vercel.json has the new entries)
--   3. Admin has opened /admin/grants/[id] for each affected cycle and
--      clicked "Reset AI Evaluations" then "Re-run AI Filter"
--
-- This script is purely for documentation and verification — the actual
-- recovery is the admin clicks, not a SQL operation. The migration is
-- idempotent and safe to re-run.

-- 1. Preview the stuck rows
SELECT
  cycle_id,
  g.id AS grant_id,
  gc.cycle_name,
  g.ai_relevance,
  g.ai_reasoning,
  g.ai_evaluated_at,
  g.submitted_at
FROM grants g
JOIN grant_cycles gc ON gc.id = g.cycle_id
WHERE g.ai_relevance = 'uncertain'
  AND g.ai_reasoning = 'AI evaluation timed out'
ORDER BY g.cycle_id, g.submitted_at;

-- 2. (No-op data migration needed — the Reset AI Evaluations button on
-- /admin/grants/[id] clears ai_relevance back to 'not_evaluated' and
-- ai_reasoning to NULL. Re-run AI Filter then enqueues the cron worker
-- to re-evaluate them.)
--
-- If you want to bulk-reset via SQL instead of clicking buttons, you can
-- run this — same effect, but the admin UI provides a confirmation step
-- we lose here:
--
-- UPDATE grants
-- SET
--   ai_relevance = 'not_evaluated',
--   ai_reasoning = NULL,
--   ai_evaluated_at = NULL,
--   ai_model_version = NULL
-- WHERE ai_relevance = 'uncertain'
--   AND ai_reasoning = 'AI evaluation timed out';
--
-- After running that UPDATE, click "Re-run AI Filter" on each affected
-- cycle page to enqueue the cron job.

NOTIFY pgrst, 'reload';
