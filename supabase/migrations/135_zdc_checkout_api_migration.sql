-- Migration: 135_zdc_checkout_api_migration.sql
-- Purpose: ZDC security fix - switch from Draft Orders to Checkout API (Storefront GraphQL)
-- This enables exact match on shopify_checkout_id in webhook

BEGIN;

-- 1. Update status CHECK constraint to include ALL valid status values
-- From migration 079: pending, created, completed, fulfilled, delivered, cancelled, rejected_invalid_user, rejected_monthly_limit
-- From code usage: paid
ALTER TABLE zero_dollar_claims DROP CONSTRAINT IF EXISTS zero_dollar_claims_status_check;
ALTER TABLE zero_dollar_claims ADD CONSTRAINT zero_dollar_claims_status_check 
  CHECK (status IN (
    'pending', 
    'created', 
    'completed', 
    'fulfilled', 
    'delivered',
    'cancelled',
    'rejected_invalid_user',
    'rejected_monthly_limit',
    'paid'
  ));

-- 2. Add index on shopify_checkout_id for fast lookups in webhook
CREATE INDEX IF NOT EXISTS idx_zero_dollar_claims_checkout_id 
  ON zero_dollar_claims(shopify_checkout_id) WHERE shopify_checkout_id IS NOT NULL;

-- 3. Add checkout_completed_at timestamp to distinguish initiated vs confirmed claims
-- This helps identify ghost/abandoned claims that were never completed
ALTER TABLE zero_dollar_claims ADD COLUMN IF NOT EXISTS checkout_completed_at TIMESTAMPTZ;

-- 4. Add shopify_checkout_id to pending_monthly_claims for cross-reference
ALTER TABLE pending_monthly_claims ADD COLUMN IF NOT EXISTS shopify_checkout_id TEXT;

-- 5. Create index on pending_monthly_claims.shopify_checkout_id for cleanup queries
CREATE INDEX IF NOT EXISTS idx_pending_monthly_claims_checkout_id 
  ON pending_monthly_claims(shopify_checkout_id) WHERE shopify_checkout_id IS NOT NULL;

-- Notify PostREST of schema change
NOTIFY pgrst, 'reload';

COMMIT;
