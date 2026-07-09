-- Migration: 110_remove_waitlist_position.sql
-- Description: Remove waitlist_position column and related function
-- Created: 2026-07-08
--
-- This migration removes the waitlist_position field since we never showed
-- position to users and didn't maintain accurate ordering on approval.
-- Chronological order is preserved via waitlist_joined_at.

-- =============================================================================
-- STEP 1: Drop the index on waitlist_position
-- =============================================================================

DROP INDEX IF EXISTS idx_profiles_waitlist_position;

-- =============================================================================
-- STEP 2: Drop the get_next_waitlist_position function
-- =============================================================================

DROP FUNCTION IF EXISTS get_next_waitlist_position();

-- =============================================================================
-- STEP 3: Drop the waitlist_position column
-- =============================================================================

ALTER TABLE profiles DROP COLUMN IF EXISTS waitlist_position;

NOTIFY pgrst, 'reload';
