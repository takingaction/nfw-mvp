-- Migration: 157_chunked_sync_all_jobs
-- Add columns for multi-phase chunked processing

ALTER TABLE sync_all_jobs 
ADD COLUMN IF NOT EXISTS progress_data JSONB,
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'pending' CHECK (current_phase IN ('pending', 'load_profiles', 'load_backfill', 'sync_missing', 'sync_payments', 'computing', 'completed')),
ADD COLUMN IF NOT EXISTS processed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_processed_id TEXT,
ADD COLUMN IF NOT EXISTS all_profile_emails JSONB,
ADD COLUMN IF NOT EXISTS backfill_status_json JSONB,
ADD COLUMN IF NOT EXISTS results_json JSONB;

NOTIFY pgrst, 'reload';
