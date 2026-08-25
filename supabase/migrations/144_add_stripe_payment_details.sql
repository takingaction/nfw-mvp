-- ============================================
-- Migration: Add Stripe Payment Details to Backfill Status
-- Purpose: Cache Stripe payment data for display in admin UI
-- ============================================

-- Add payment columns to stripe_backfill_status
ALTER TABLE stripe_backfill_status ADD COLUMN IF NOT EXISTS payment_count INTEGER DEFAULT 0;
ALTER TABLE stripe_backfill_status ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE stripe_backfill_status ADD COLUMN IF NOT EXISTS has_failed BOOLEAN DEFAULT FALSE;
ALTER TABLE stripe_backfill_status ADD COLUMN IF NOT EXISTS has_refunded BOOLEAN DEFAULT FALSE;
ALTER TABLE stripe_backfill_status ADD COLUMN IF NOT EXISTS latest_payment_date TIMESTAMPTZ;
ALTER TABLE stripe_backfill_status ADD COLUMN IF NOT EXISTS latest_payment_status TEXT;
ALTER TABLE stripe_backfill_status ADD COLUMN IF NOT EXISTS latest_payment_amount NUMERIC(10,2);
ALTER TABLE stripe_backfill_status ADD COLUMN IF NOT EXISTS latest_payment_error TEXT;
ALTER TABLE stripe_backfill_status ADD COLUMN IF NOT EXISTS all_payments_json JSONB;
ALTER TABLE stripe_backfill_status ADD COLUMN IF NOT EXISTS payment_sync_at TIMESTAMPTZ;

-- Add stripe_subscription_id for unmatched subscribers
ALTER TABLE stripe_backfill_status ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add processed_at to track when customer was last synced
ALTER TABLE stripe_backfill_status ADD COLUMN IF NOT EXISTS customer_processed_at TIMESTAMPTZ;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_backfill_payment_sync ON stripe_backfill_status(payment_sync_at);
CREATE INDEX IF NOT EXISTS idx_backfill_status_stripe_customer ON stripe_backfill_status(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_backfill_status_latest_status ON stripe_backfill_status(latest_payment_status);

NOTIFY pgrst, 'reload';

-- ============================================
-- VERIFY: Run this to confirm migration succeeded
-- ============================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'stripe_backfill_status'
-- AND column_name IN ('payment_count', 'total_amount', 'has_failed', 'has_refunded',
--                      'latest_payment_date', 'latest_payment_status', 'latest_payment_amount',
--                      'latest_payment_error', 'all_payments_json', 'payment_sync_at',
--                      'stripe_subscription_id', 'customer_processed_at')
-- ORDER BY column_name;
