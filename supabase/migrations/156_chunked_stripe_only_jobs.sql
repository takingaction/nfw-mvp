-- Migration: 156_chunked_stripe_only_jobs
-- Add columns for multi-phase chunked processing

ALTER TABLE stripe_only_jobs 
ADD COLUMN IF NOT EXISTS progress_data JSONB,
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'pending' CHECK (current_phase IN ('pending', 'enum_customers', 'fetch_charges', 'computing', 'completed')),
ADD COLUMN IF NOT EXISTS processed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_processed_id TEXT,
ADD COLUMN IF NOT EXISTS charges_json JSONB,
ADD COLUMN IF NOT EXISTS stripe_duplicates_json JSONB,
ADD COLUMN IF NOT EXISTS duplicates_json JSONB,
ADD COLUMN IF NOT EXISTS missing_from_backfill_json JSONB;

-- Drop old columns if they exist (clean up old schema)
ALTER TABLE stripe_only_jobs DROP COLUMN IF EXISTS charges_json;
ALTER TABLE stripe_only_jobs DROP COLUMN IF EXISTS stripe_duplicates_json;
ALTER TABLE stripe_only_jobs DROP COLUMN IF EXISTS duplicates_json;
ALTER TABLE stripe_only_jobs DROP COLUMN IF EXISTS missing_from_backfill_json;

NOTIFY pgrst, 'reload';
