-- Migration: 167_add_rejection_message_to_grant_cycles.sql
-- Purpose: Add customizable rejection message fields (3 bullet points) to grant_cycles table
-- This allows admins to set custom "not approved" message per grant cycle

ALTER TABLE grant_cycles
ADD COLUMN IF NOT EXISTS rejection_message_1 TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rejection_message_2 TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rejection_message_3 TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN grant_cycles.rejection_message_1 IS 'First rejection message bullet point. Use {{rejectionMessage1}} variable in email template.';
COMMENT ON COLUMN grant_cycles.rejection_message_2 IS 'Second rejection message bullet point. Use {{rejectionMessage2}} variable in email template.';
COMMENT ON COLUMN grant_cycles.rejection_message_3 IS 'Third rejection message bullet point. Use {{rejectionMessage3}} variable in email template.';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
