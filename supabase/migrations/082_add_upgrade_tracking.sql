-- Add columns to track first paid membership upgrade
ALTER TABLE profiles ADD COLUMN first_paid_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN first_paid_level TEXT;

-- Index for efficient queries on upgrade reports
CREATE INDEX IF NOT EXISTS idx_profiles_first_paid_at ON profiles(first_paid_at);

NOTIFY pgrst, 'reload';