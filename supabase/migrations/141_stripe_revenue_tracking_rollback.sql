-- ============================================
-- Migration: Rollback Stripe Revenue Tracking
-- Purpose: Revert all changes from 140_stripe_revenue_tracking.sql
-- RUN THIS ONLY IF YOU NEED TO UNDO THE CHANGES
-- ============================================

-- ============================================
-- STEP 1: Drop RLS policies first (if they exist)
-- ============================================

DROP POLICY IF EXISTS "Admin users can view membership upgrades" ON membership_upgrades;
DROP POLICY IF EXISTS "Service role can insert membership upgrades" ON membership_upgrades;
DROP POLICY IF EXISTS "Admin users can view membership payments" ON membership_payments;
DROP POLICY IF EXISTS "Service role can insert membership payments" ON membership_payments;
DROP POLICY IF EXISTS "Admin users can view stripe backfill status" ON stripe_backfill_status;
DROP POLICY IF EXISTS "Service role can manage stripe backfill status" ON stripe_backfill_status;

-- ============================================
-- STEP 2: Disable RLS
-- ============================================

ALTER TABLE membership_upgrades DISABLE ROW LEVEL SECURITY;
ALTER TABLE membership_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_backfill_status DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Drop tables (order matters due to FK constraints)
-- ============================================

DROP TABLE IF EXISTS membership_upgrades;
DROP TABLE IF EXISTS membership_payments;
DROP TABLE IF EXISTS stripe_backfill_status;

-- ============================================
-- STEP 4: Remove columns from profiles
-- ============================================

ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS lifetime_value;
ALTER TABLE profiles DROP COLUMN IF EXISTS signup_source;
ALTER TABLE profiles DROP COLUMN IF EXISTS previous_membership_level;

-- ============================================
-- STEP 5: Drop indexes (if they still exist)
-- ============================================

DROP INDEX IF EXISTS idx_profiles_stripe_customer_id;
DROP INDEX IF EXISTS idx_profiles_signup_source;
DROP INDEX IF EXISTS idx_profiles_previous_membership_level;
DROP INDEX IF EXISTS idx_membership_upgrades_user_id;
DROP INDEX IF EXISTS idx_membership_upgrades_created_at;
DROP INDEX IF EXISTS idx_membership_payments_user_id;
DROP INDEX IF EXISTS idx_membership_payments_created_at;
DROP INDEX IF EXISTS idx_membership_payments_payment_type;
DROP INDEX IF EXISTS idx_backfill_status_profile_id;
DROP INDEX IF EXISTS idx_backfill_status_status;
DROP INDEX IF EXISTS idx_backfill_status_email;

-- ============================================
-- STEP 6: Notify PostgREST to reload schema cache
-- ============================================

NOTIFY pgrst, 'reload';

-- ============================================
-- VERIFY: Run this to confirm rollback succeeded
-- ============================================
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
--   AND column_name IN ('stripe_customer_id', 'lifetime_value', 'signup_source', 'previous_membership_level');
-- Should return 0 rows if rollback succeeded
-- 
-- SELECT COUNT(*) as tables_remaining 
-- FROM information_schema.tables 
-- WHERE table_name IN ('membership_upgrades', 'membership_payments');
-- Should return 0 if tables were dropped
