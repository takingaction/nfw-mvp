-- Migration: 168_add_rejection_message_to_grant_cycles.sql
-- Adds a single warm closing / intro line for grant rejection emails

ALTER TABLE grant_cycles
  ADD COLUMN IF NOT EXISTS rejection_message TEXT DEFAULT NULL;

COMMENT ON COLUMN grant_cycles.rejection_message IS
  'Warm closing / intro line shown before rejection bullet points. Use {{rejectionMessage}} variable in email template.';

NOTIFY pgrst, 'reload';
