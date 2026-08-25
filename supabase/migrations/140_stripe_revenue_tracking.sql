-- ============================================
-- Migration: Stripe Revenue Tracking
-- Purpose: Add columns and tables for Stripe-verified revenue tracking
-- ============================================

-- ============================================
-- STEP 1: Add columns to profiles table
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'unknown';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS previous_membership_level TEXT;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_signup_source ON profiles(signup_source) WHERE signup_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_previous_membership_level ON profiles(previous_membership_level) WHERE previous_membership_level IS NOT NULL;

-- ============================================
-- STEP 2: Create membership_upgrades table
-- ============================================

CREATE TABLE IF NOT EXISTS membership_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_level TEXT NOT NULL,
  to_level TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_upgrades_user_id ON membership_upgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_upgrades_created_at ON membership_upgrades(created_at);

-- ============================================
-- STEP 3: Create membership_payments table
-- ============================================

CREATE TABLE IF NOT EXISTS membership_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_type TEXT CHECK (payment_type IN ('signup', 'renewal', 'upgrade', 'refund')),
  stripe_payment_id TEXT,
  stripe_invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_payments_user_id ON membership_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_payments_created_at ON membership_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_membership_payments_payment_type ON membership_payments(payment_type);

-- ============================================
-- STEP 4: Notify PostgREST to reload schema cache
-- ============================================

NOTIFY pgrst, 'reload';

-- ============================================
-- VERIFY: Run this to confirm migration succeeded
-- ============================================
-- SELECT 
--   'profiles' as table_name,
--   COUNT(*) as new_columns
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
--   AND column_name IN ('stripe_customer_id', 'lifetime_value', 'signup_source', 'previous_membership_level');
-- 
-- SELECT COUNT(*) as upgrades_table_exists FROM information_schema.tables WHERE table_name = 'membership_upgrades';
-- SELECT COUNT(*) as payments_table_exists FROM information_schema.tables WHERE table_name = 'membership_payments';
