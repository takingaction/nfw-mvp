-- Add is_approved_free_member column for admin-controlled free membership
ALTER TABLE profiles ADD COLUMN is_approved_free_member BOOLEAN DEFAULT FALSE;

-- Grandfather in existing free members (they keep access)
UPDATE profiles SET is_approved_free_member = TRUE WHERE membership_level = 'free' OR membership_level IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.is_approved_free_member IS 'For free members: TRUE = approved by admin and has full access, FALSE = pending approval';

-- Create index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved_free_member ON profiles(is_approved_free_member) WHERE membership_level = 'free';

NOTIFY pgrst, 'reload';
