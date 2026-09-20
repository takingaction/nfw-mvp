-- Migration: 176_create_ai_backfill_jobs.sql
-- Same cron + job-table refactor as ai_reevaluate_jobs (migration 175), but
-- for the "Continue AI Backfill" button on /admin/grants/[id]. The original
-- synchronous route shared the same vulnerability: maxDuration=300 with a
-- 250s self-imposed budget meant any cycle with a large number of
-- not-yet-evaluated apps would 504 the same way ai-reevaluate did.
--
-- Differences from ai_reevaluate_jobs:
--   - No force_full flag (the original backfill only ever processes
--     submitted grants that are not yet evaluated)
--   - Skips if grant_cycles.scoring_started_at IS NULL (preserves the
--     existing guard that the original route enforced)
--   - Records the cycle's scoring_started_at value to make the guard
--     re-checkable on resume

CREATE TABLE IF NOT EXISTS ai_backfill_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  cycle_id UUID NOT NULL REFERENCES grant_cycles(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),

  current_phase TEXT,

  processed_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  succeeded_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,

  -- Snapshot of in-scope grant IDs (only 'submitted' grants with NULL or
  -- 'not_evaluated' ai_relevance)
  grant_ids_json JSONB,
  -- Cursor for resume
  last_processed_id UUID,

  progress TEXT,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- 24h cache TTL
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_backfill_jobs_status
  ON ai_backfill_jobs(status, created_at);

ALTER TABLE ai_backfill_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages ai_backfill_jobs"
  ON ai_backfill_jobs FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload';
