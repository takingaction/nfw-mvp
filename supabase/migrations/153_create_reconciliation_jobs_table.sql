-- Migration: 153_create_reconciliation_jobs_table.sql
-- Background job queue for Stripe reconciliation

CREATE TABLE IF NOT EXISTS reconciliation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('stripe_live', 'payment_verify')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- Job 1: Stripe Live Stats
  stripe_live_json JSONB,
  missing_from_db TEXT[],
  -- Job 2: Payment Verification
  verified_payments_json JSONB,
  problematic_payments_json JSONB,
  verified_count_json JSONB,
  -- Progress tracking
  progress TEXT,
  error TEXT
);

-- Index for efficient job polling
CREATE INDEX IF NOT EXISTS idx_reconciliation_jobs_status ON reconciliation_jobs(status) WHERE status IN ('pending', 'processing');

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_reconciliation_jobs_expires ON reconciliation_jobs(expires_at) WHERE expires_at IS NOT NULL;

-- RLS - allow admin access
ALTER TABLE reconciliation_jobs ENABLE ROW LEVEL SECURITY;

-- Admin policy (service role bypasses RLS anyway)
CREATE POLICY "Admin full access" ON reconciliation_jobs
  FOR ALL USING (true);

NOTIFY pgrst, 'reload';
