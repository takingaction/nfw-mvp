-- Migration: 175_create_ai_reevaluate_jobs.sql
-- Refactor /api/admin/grants/[id]/ai-reevaluate from a synchronous 300s-budget
-- chunked loop into the established cron + job-table pattern used by
-- reconciliation_jobs, stripe_only_jobs, stripe_duplicates_jobs, sync_all_jobs
-- and missing_payments_jobs.
--
-- The synchronous route returned 504 FUNCTION_INVOCATION_TIMEOUT for any cycle
-- with a large number of apps (Claude latency spikes + 200ms throttle pushes the
-- loop past Vercel's 300s ceiling). The page in /admin/grants/[id] then tried to
-- JSON.parse the HTML timeout error page and threw a SyntaxError.
--
-- New behavior:
--   POST -> trigger-only: race-guarded job row creation, returns { jobId, status }
--   GET  -> status check for client polling (returns phase, counts, errors)
--   /api/cron/process-ai-reevaluate-jobs (every 5 min) -> does the work
-- The worker uses a phase machine with last_processed_id cursor so a partial
-- run can resume cleanly after a deploy/restart. Worker time budget stays
-- inside the 300s Vercel ceiling (25 grants per tick × 200ms = ~5s of sleeps
-- + Claude latency, easily fits).

CREATE TABLE IF NOT EXISTS ai_reevaluate_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which cycle this job targets (and whose grants we'll re-evaluate)
  cycle_id UUID NOT NULL REFERENCES grant_cycles(id) ON DELETE CASCADE,

  -- Mirror of the original ?onlyNonRelevant=false behavior:
  -- false (default) -> only re-evaluate apps that are NOT 'relevant'
  -- true            -> force re-evaluate ALL submitted apps
  force_full BOOLEAN NOT NULL DEFAULT FALSE,

  -- Same lifecycle as the other job tables
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),

  -- Phase machine:
  --   'enroll_grants' -> snapshot the in-scope grant IDs into cycle_grants_json
  --   'evaluate'      -> chunked re-evaluation with last_processed_id cursor
  --   'completed'     -> terminal (status='completed')
  current_phase TEXT,

  -- Worker progress
  processed_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  succeeded_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,

  -- Checkpoint state
  cycle_grants_json JSONB,            -- Array of grant IDs in scope
  last_processed_id UUID,             -- cursor: last grant id the worker processed

  -- UI-facing status text (mirrors stripe_only_jobs.progress)
  progress TEXT,

  -- Diagnostics
  error_message TEXT,

  -- Lifecycle timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- 24h cache TTL like the other job tables — page reads only completed jobs
  -- where expires_at is still in the future. Once expired the UI treats the
  -- stored counts as stale and the next job trigger will refresh them.
  expires_at TIMESTAMPTZ
);

-- Cron worker pulls oldest pending|processing job; this index keeps the
-- ORDER BY created_at LIMIT 1 cheap.
CREATE INDEX IF NOT EXISTS idx_ai_reevaluate_jobs_status
  ON ai_reevaluate_jobs(status, created_at);

-- Same admin-only RLS pattern as flodesk_sync_rules, missing_payments_jobs,
-- stripe_only_jobs, stripe_duplicates_jobs — service role bypasses via the
-- admin client; admins via public.is_admin() check.
ALTER TABLE ai_reevaluate_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages ai_reevaluate_jobs"
  ON ai_reevaluate_jobs FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload';
