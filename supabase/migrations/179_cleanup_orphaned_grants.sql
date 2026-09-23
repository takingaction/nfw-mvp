-- Migration 179: Cleanup orphan grants log table + detection helper
--
-- The "upload-first" flow (2026-09-23) prevents NEW orphan grants: if any
-- document upload fails, the grant row is never inserted. But this does
-- not help pre-existing orphan grants (members whose grant_documents
-- inserts failed before this date and who never got the files attached).
--
-- This migration creates a log table that the daily
-- /api/cron/cleanup-orphaned-grants cron writes to, plus a SECURITY
-- DEFINER function that detects candidates. The cron is READ-ONLY — it
-- identifies candidates and emits a Slack alert with the list. No row
-- is deleted by the cron; admins decide what to do. This is
-- intentionally a no-mutation change.
--
-- Detection criteria:
--   grant has zero grant_documents rows
--     AND cycle.requires_documents = true
--     AND grant.submitted_at < NOW() - INTERVAL '24 hours'
--
-- The 24h delay gives in-flight upload-first submissions time to
-- complete before they get flagged as orphans.

CREATE TABLE IF NOT EXISTS cleanup_orphan_grants_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_count INTEGER NOT NULL DEFAULT 0,
  orphan_grants JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cleanup_orphan_grants_log_run_at
  ON cleanup_orphan_grants_log(run_at DESC);

COMMENT ON TABLE cleanup_orphan_grants_log IS
  'Read-only audit log of daily orphan-grant scan runs. The cron writes a row per run with the list of grants it identified; admins decide what to do via the reviewer panel or directly in Supabase.';

-- Detection function. SECURITY DEFINER so the cron (using the service
-- role key) can call it without depending on RLS policy details; the
-- function reads from public.grants and public.grant_documents which
-- the service role bypasses anyway.
CREATE OR REPLACE FUNCTION find_orphan_grant_candidates(
  min_hours_old INTEGER DEFAULT 24,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  grant_id UUID,
  user_id UUID,
  cycle_id UUID,
  cycle_name TEXT,
  submitted_at TIMESTAMPTZ,
  hours_since_submit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id AS grant_id,
    g.user_id,
    g.cycle_id,
    gc.cycle_name,
    g.submitted_at,
    EXTRACT(EPOCH FROM (NOW() - g.submitted_at))::INTEGER / 3600 AS hours_since_submit
  FROM grants g
  JOIN grant_cycles gc ON gc.id = g.cycle_id
  LEFT JOIN grant_documents d ON d.grant_id = g.id
  WHERE d.id IS NULL
    AND gc.requires_documents = true
    AND g.submitted_at < NOW() - (min_hours_old || ' hours')::INTERVAL
  ORDER BY g.submitted_at ASC
  LIMIT max_results;
END;
$$;

NOTIFY pgrst, 'reload';

