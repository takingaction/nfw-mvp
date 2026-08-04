-- Migration: 134_add_grant_email_retry_status.sql
-- Description: Add already_sent status and last_resend_status for tracking retries
-- Created: 2026-08-04

-- Drop existing check constraint and add new one with 'already_sent'
ALTER TABLE grant_email_log DROP CONSTRAINT IF EXISTS grant_email_log_status_check;
ALTER TABLE grant_email_log ADD CONSTRAINT grant_email_log_status_check
  CHECK (status IN ('sent', 'failed', 'already_sent'));

-- Add last_resend_status column to track what Resend reported
ALTER TABLE grant_email_log ADD COLUMN IF NOT EXISTS last_resend_status TEXT;

-- Add index for efficient queries on new column
CREATE INDEX IF NOT EXISTS idx_grant_email_log_resend_status ON grant_email_log(last_resend_status);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload';
