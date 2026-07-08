-- Migration: 108_add_waitlist_membership.sql
-- Description: Add waitlist membership level and tracking columns
-- Created: 2026-07-08
--
-- This migration adds waitlist as a 4th membership level and tracking columns.
-- Waitlist members are those who applied for free membership but are waiting for a spot.

-- =============================================================================
-- STEP 1: Update membership_level CHECK constraint to include 'waitlist'
-- =============================================================================

-- Drop existing check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_membership_level_check;

-- Add new check constraint with waitlist
ALTER TABLE profiles ADD CONSTRAINT profiles_membership_level_check 
  CHECK (membership_level IN ('free', 'contributing', 'founding', 'waitlist'));

-- =============================================================================
-- STEP 2: Add waitlist tracking columns
-- =============================================================================

-- Position in waitlist queue (NULL for non-waitlist members)
ALTER TABLE profiles ADD COLUMN waitlist_position INTEGER;

-- Timestamp when welcome email was sent to waitlist member
ALTER TABLE profiles ADD COLUMN waitlist_email_sent_at TIMESTAMPTZ;

-- Timestamp when member joined the waitlist
ALTER TABLE profiles ADD COLUMN waitlist_joined_at TIMESTAMPTZ;

-- =============================================================================
-- STEP 3: Create index for efficient waitlist queries
-- =============================================================================

-- Index for finding members by waitlist position
CREATE INDEX IF NOT EXISTS idx_profiles_waitlist_position 
  ON profiles(waitlist_position) 
  WHERE waitlist_position IS NOT NULL;

-- Index for finding waitlist members who haven't received welcome email
CREATE INDEX IF NOT EXISTS idx_profiles_waitlist_email_pending 
  ON profiles(id) 
  WHERE membership_level = 'waitlist' 
    AND waitlist_email_sent_at IS NULL;

-- =============================================================================
-- STEP 4: Create function to get waitlist count
-- =============================================================================

CREATE OR REPLACE FUNCTION get_waitlist_count()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM profiles
  WHERE membership_level = 'waitlist';
  
  RETURN count;
END;
$$;

-- =============================================================================
-- STEP 5: Create function to get next waitlist position
-- =============================================================================

CREATE OR REPLACE FUNCTION get_next_waitlist_position()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  next_pos INTEGER;
BEGIN
  SELECT COALESCE(MAX(waitlist_position), 0) + 1 INTO next_pos
  FROM profiles
  WHERE membership_level = 'waitlist';
  
  RETURN next_pos;
END;
$$;

NOTIFY pgrst, 'reload';
