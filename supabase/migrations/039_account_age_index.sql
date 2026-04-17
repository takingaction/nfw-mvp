-- Migration: 039_account_age_index.sql
-- Description: Add index on profiles.joined_at for account age verification queries
-- Created: 2026-04-17

-- Index for account age verification in fraud prevention checks
-- Used by Access Perks redemption and Zero Dollar Store checkout to verify account age
CREATE INDEX IF NOT EXISTS idx_profiles_joined_at ON profiles(joined_at);

COMMENT ON INDEX idx_profiles_joined_at IS 'Used for account age verification in fraud prevention checks';
