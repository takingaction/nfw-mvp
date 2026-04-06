-- Migration: Add display_order to grant_cycles for admin reordering
-- Created: 2026-04-05

ALTER TABLE grant_cycles 
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Set display_order to created_at timestamp as a proxy for initial ordering
-- Lower values appear first
UPDATE grant_cycles 
SET display_order = EXTRACT(EPOCH FROM created_at)::INTEGER;

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_grant_cycles_display_order ON grant_cycles(display_order);
