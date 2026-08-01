-- Add column to track previous membership level for upgrade analytics
ALTER TABLE profiles ADD COLUMN previous_membership_level TEXT;

-- Index for efficient queries on upgrade reports
CREATE INDEX IF NOT EXISTS idx_profiles_previous_membership_level ON profiles(previous_membership_level);

NOTIFY pgrst, 'reload';
