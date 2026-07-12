-- Migration: 113_add_incomplete_email_sent_at.sql
-- Description: Add incomplete_email_sent_at column to track reengagement emails
-- Created: 2026-07-10

-- Add column to track when reengagement email was sent
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS incomplete_email_sent_at TIMESTAMPTZ;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_incomplete_email_sent_at ON profiles(incomplete_email_sent_at);

-- Note: This column is separate from profile_completed to allow:
-- 1. Tracking when emails were sent
-- 2. Supporting both manual sends and 72-hour automation
-- 3. Allowing re-sends if needed

NOTIFY pgrst, 'reload';