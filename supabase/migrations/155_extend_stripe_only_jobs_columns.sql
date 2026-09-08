-- Migration: Extend stripe_only_jobs table with duplicate/missing datasets
-- These columns will store the computed results from the job processor

ALTER TABLE stripe_only_jobs 
ADD COLUMN IF NOT EXISTS stripe_duplicates_json JSONB,
ADD COLUMN IF NOT EXISTS duplicates_json JSONB,
ADD COLUMN IF NOT EXISTS missing_from_backfill_json JSONB;

NOTIFY pgrst, 'reload';
