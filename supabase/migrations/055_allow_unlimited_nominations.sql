-- Drop existing unique constraint on (user_id, cycle_id)
ALTER TABLE grants DROP CONSTRAINT IF EXISTS grants_user_cycle_unique;

-- Add partial unique index for self-applications only
-- This allows unlimited nominations (is_nominating = true) but only 1 self-application (is_nominating = false) per cycle
CREATE UNIQUE INDEX idx_grants_self_application_per_cycle 
  ON grants(user_id, cycle_id) 
  WHERE is_nominating = false;
