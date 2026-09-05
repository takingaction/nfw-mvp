-- Migration: 154_create_stripe_only_jobs_table.sql
-- Background job queue for Stripe Only charges export

CREATE TABLE IF NOT EXISTS stripe_only_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- Results
  charges_json JSONB,
  total NUMERIC DEFAULT 0,
  error TEXT
);

-- Index for efficient job polling
CREATE INDEX IF NOT EXISTS idx_stripe_only_jobs_status ON stripe_only_jobs(status) WHERE status IN ('pending', 'processing');

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_stripe_only_jobs_expires ON stripe_only_jobs(expires_at) WHERE expires_at IS NOT NULL;

-- RLS - allow admin access
ALTER TABLE stripe_only_jobs ENABLE ROW LEVEL SECURITY;

-- Admin policy (service role bypasses RLS anyway)
CREATE POLICY "Admin full access" ON stripe_only_jobs
  FOR ALL USING (true);

NOTIFY pgrst, 'reload';
