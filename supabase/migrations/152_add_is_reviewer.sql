-- Migration: Add is_reviewer to profiles
-- Purpose: Allow users hired as reviewers to access grant scoring pages without full admin access

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_reviewer BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_reviewer ON profiles(is_reviewer) WHERE is_reviewer = TRUE;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
