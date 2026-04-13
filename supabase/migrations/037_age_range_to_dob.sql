-- Migration: 037_age_range_to_dob.sql
-- Description: Replace age_range dropdown with date_of_birth input
-- Created: 2026-04-13

-- =============================================================================
-- ADD date_of_birth COLUMN IF NOT EXISTS
-- =============================================================================

-- Add date_of_birth column if it doesn't exist (it may be referenced but not created)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- =============================================================================
-- BACKFILL EXISTING DATA
-- =============================================================================

-- Set existing NULL date_of_birth to placeholder date for compliance
-- These profiles will need to update their actual date of birth
UPDATE profiles SET date_of_birth = '1900-01-01' WHERE date_of_birth IS NULL;

-- =============================================================================
-- UPDATE DATA TYPE AND CONSTRAINTS
-- =============================================================================

-- Add NOT NULL constraint (all existing NULLs are now '1900-01-01')
ALTER TABLE profiles ALTER COLUMN date_of_birth SET NOT NULL;

-- Add CHECK constraint to enforce valid dates (born after 1900 and 18+ years old)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_date_of_birth') THEN
        ALTER TABLE profiles ADD CONSTRAINT chk_profiles_date_of_birth 
            CHECK (
                date_of_birth >= '1900-01-01' 
                AND date_of_birth <= CURRENT_DATE - INTERVAL '18 years'
            );
    END IF;
END $$;

-- =============================================================================
-- REMOVE age_range COLUMN
-- =============================================================================

-- Drop the age_range column (replaced by date_of_birth)
ALTER TABLE profiles DROP COLUMN IF EXISTS age_range;

-- Drop the index on age_range if it exists
DROP INDEX IF EXISTS idx_profiles_membership_level;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN profiles.date_of_birth IS 'Member date of birth - must be 18+ and born after 1900';
