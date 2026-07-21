-- Migration: 122_index_for_incomplete_reminder.sql
-- Description: Add index for incomplete member reminder cron query
-- Created: 2026-07-20

-- Add index for incomplete member reminder query
-- Helps when filtering by joined_at < 2 hours ago AND incomplete_email_sent_at IS NULL
CREATE INDEX IF NOT EXISTS idx_profiles_incomplete_reminder
ON profiles(joined_at, incomplete_email_sent_at)
WHERE incomplete_email_sent_at IS NULL;

NOTIFY pgrst, 'reload';
