-- Migration: Split StripeDuplicates into separate job
-- Creates dedicated table for duplicates job, removes duplicates column from stripe_only_jobs

-- Create stripe_duplicates_jobs table
CREATE TABLE IF NOT EXISTS stripe_duplicates_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error TEXT,
  total_subscriptions INTEGER DEFAULT 0,
  duplicate_emails_count INTEGER DEFAULT 0,
  duplicates_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_stripe_duplicates_jobs_status ON stripe_duplicates_jobs(status);

-- Cleanup: remove stripe_duplicates_json from stripe_only_jobs (duplicates now in separate table)
ALTER TABLE stripe_only_jobs DROP COLUMN IF EXISTS stripe_duplicates_json;

NOTIFY pgrst, 'reload';
