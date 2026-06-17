-- Fix free members showing "Active" status
-- Free members should have subscription_status = NULL, not 'active'

UPDATE profiles
SET subscription_status = NULL,
    updated_at = NOW()
WHERE membership_level = 'free'
  AND subscription_status = 'active';
