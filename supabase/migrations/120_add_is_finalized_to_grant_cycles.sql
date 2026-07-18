-- Migration: Add is_finalized flag to grant_cycles
-- Created: 2026-07-18

-- Add is_finalized column to track when a cycle has been fully completed
-- This is an administrative flag, not a status - it doesn't affect application logic
ALTER TABLE grant_cycles ADD COLUMN is_finalized BOOLEAN DEFAULT FALSE;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
