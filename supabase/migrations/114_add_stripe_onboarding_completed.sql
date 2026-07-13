-- Migration: 114_add_stripe_onboarding_completed.sql
-- Adds stripe_onboarding_completed field to track if user completed Stripe Connect onboarding

ALTER TABLE profiles ADD COLUMN stripe_onboarding_completed BOOLEAN DEFAULT FALSE;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_onboarding_completed ON profiles(stripe_onboarding_completed);

NOTIFY pgrst, 'reload';
