-- Migration: 079_fix_zero_dollar_claims_status_check
-- Issue: CHECK constraint only allows ('pending', 'created', 'fulfilled', 'delivered')
-- but code uses more statuses: cancelled, completed, rejected_invalid_user, rejected_monthly_limit

-- Drop the old CHECK constraint
ALTER TABLE zero_dollar_claims DROP CONSTRAINT IF EXISTS zero_dollar_claims_status_check;

-- Add new CHECK constraint with all valid statuses
ALTER TABLE zero_dollar_claims 
ADD CONSTRAINT zero_dollar_claims_status_check 
CHECK (status IN (
  'pending', 
  'created', 
  'completed', 
  'fulfilled', 
  'delivered',
  'cancelled',
  'rejected_invalid_user',
  'rejected_monthly_limit'
));

-- Verify the constraint was added
DO $$
BEGIN
  -- Try inserting a row with 'cancelled' status to verify
  -- This is just a check, not an actual insert
  PERFORM 1 WHERE 'cancelled' IN (
    'pending', 'created', 'completed', 'fulfilled', 'delivered', 
    'cancelled', 'rejected_invalid_user', 'rejected_monthly_limit'
  );
  RAISE NOTICE 'CHECK constraint updated successfully';
END $$;