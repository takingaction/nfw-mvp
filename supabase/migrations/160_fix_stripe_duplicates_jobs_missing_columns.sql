-- Migration: Fix stripe_duplicates_jobs missing columns
-- The cron worker expects these columns to exist

ALTER TABLE stripe_duplicates_jobs 
ADD COLUMN IF NOT EXISTS progress_data JSONB,
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS processed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Also add missing index for updated_at
CREATE INDEX IF NOT EXISTS idx_stripe_duplicates_jobs_updated 
ON stripe_duplicates_jobs(updated_at) 
WHERE updated_at IS NOT NULL;

NOTIFY pgrst, 'reload';
