-- Fix: Drop the actual constraint name that's causing duplicates
-- The previous migration (055) dropped the wrong constraint name

-- Drop the unique constraint that's blocking nominations
ALTER TABLE grants DROP CONSTRAINT IF EXISTS grants_user_id_cycle_id_key;

-- Create partial unique index for self-applications only
-- This allows unlimited nominations (is_nominating = true) but only 1 self-application (is_nominating = false) per cycle
DROP INDEX IF EXISTS idx_grants_self_application_per_cycle;
CREATE UNIQUE INDEX idx_grants_self_application_per_cycle
  ON grants(user_id, cycle_id)
  WHERE is_nominating = false;

NOTIFY pgrst, 'reload';