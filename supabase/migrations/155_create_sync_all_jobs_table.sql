-- Migration: 155_create_sync_all_jobs_table.sql
-- Creates table for tracking sync-all background jobs

CREATE TABLE IF NOT EXISTS sync_all_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_records INT DEFAULT 0,
  processed_records INT DEFAULT 0,
  synced_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for efficient job polling
CREATE INDEX IF NOT EXISTS idx_sync_all_jobs_status ON sync_all_jobs(status) WHERE status IN ('pending', 'processing');

-- Enable RLS
ALTER TABLE sync_all_jobs ENABLE ROW LEVEL SECURITY;

-- Service role can manage (bypasses RLS for supabaseAdmin)
CREATE POLICY "Service role can manage sync_all_jobs"
  ON sync_all_jobs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
