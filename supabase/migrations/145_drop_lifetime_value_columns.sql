-- Migration: Drop lifetime_value columns
-- These values should be computed from membership_payments, not stored
-- membership_payments is the single source of truth for payment financial data

ALTER TABLE profiles DROP COLUMN IF EXISTS lifetime_value;
ALTER TABLE stripe_backfill_status DROP COLUMN IF EXISTS lifetime_value;

NOTIFY pgrst, 'reload';
