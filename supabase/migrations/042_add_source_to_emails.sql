-- Migration: 042_add_source_to_emails.sql
-- Description: Add source column to coming_soon_emails and backfill existing records
-- Created: 2026-04-20

-- Add source column to track where signups originated
ALTER TABLE coming_soon_emails
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'coming-soon';

-- Update existing records to be tagged as 'coming-soon'
UPDATE coming_soon_emails
SET source = 'coming-soon'
WHERE source IS NULL;

-- Add index for filtering by source
CREATE INDEX IF NOT EXISTS idx_coming_soon_emails_source ON coming_soon_emails(source);

COMMENT ON COLUMN coming_soon_emails.source IS 'Origin of signup: coming-soon, footer, etc.';