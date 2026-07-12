-- Migration: 114_add_is_testing_only_to_grant_cycles.sql
-- Description: Add is_testing_only flag to grant_cycles table
-- Created: 2026-07-12

ALTER TABLE grant_cycles ADD COLUMN is_testing_only BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_grant_cycles_is_testing_only ON grant_cycles(is_testing_only);

NOTIFY pgrst, 'reload';
