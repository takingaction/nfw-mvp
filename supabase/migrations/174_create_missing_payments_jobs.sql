-- Migration: 174_create_missing_payments_jobs.sql
-- Refactor /api/admin/backfill/stripe/missing-payments from a synchronous 300s
-- timeout-bound route to the established cron + job-table pattern used by
-- reconciliation_jobs, stripe_only_jobs, stripe_duplicates_jobs and sync_all_jobs.
--
-- The page on /admin/backfill/stripe used to fire the old route on every mount;
-- the Stripe-side subscription count grew past the point where the synchronous
-- route could fit in Vercel's 300s ceiling (FUNCTION_INVOCATION_TIMEOUT seen in
-- production). The job row stores the final Stripe-vs-DB diff so the page can
-- render from cache instantly, and the cron worker recomputes on a 10-min cadence.

CREATE TABLE IF NOT EXISTS missing_payments_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- 'cron' | 'admin' | 'page_load'
  triggered_by TEXT NOT NULL DEFAULT 'cron',

  -- Worker progress
  stripe_subscriptions_total INTEGER NOT NULL DEFAULT 0,
  stripe_subscriptions_processed INTEGER NOT NULL DEFAULT 0,

  -- Final result, written on completion
  missing_contributing_count INTEGER NOT NULL DEFAULT 0,
  missing_founding_count INTEGER NOT NULL DEFAULT 0,
  contributing_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  founding_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary_json JSONB,

  -- Diagnostics
  elapsed_ms INTEGER,
  error_message TEXT,

  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Cache TTL: 24h from completion. Page reads only completed jobs where
  -- expires_at IS NULL OR expires_at > now(). Cron auto-refreshes every 10 min.
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_missing_payments_jobs_status_created
  ON missing_payments_jobs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_missing_payments_jobs_expires
  ON missing_payments_jobs (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE missing_payments_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view missing_payments_jobs"
  ON missing_payments_jobs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Writes go through API routes using the service-role client which bypasses RLS.
-- No admin-write policy: admin updates go through supabaseAdmin only.

NOTIFY pgrst, 'reload';
