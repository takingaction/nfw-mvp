-- Migration: Fix zero_dollar_claims with NULL shopify_order_id
-- Issue: orders/create webhook failed to update claims because shopify_checkout_id format mismatch
-- (we stored checkout_{timestamp} but Shopify sends gid://shopify/Checkout/{id})

-- Fix 1: Set claim_month based on claimed_at date (these are all June 2026 claims)
UPDATE zero_dollar_claims 
SET claim_month = DATE_TRUNC('month', claimed_at)::date
WHERE shopify_order_id IS NULL 
AND claim_month IS NULL;

-- Fix 2: Mark as cancelled (these orders were all cancelled in Shopify)
-- Note: We cannot auto-fix shopify_checkout_id because we don't have the real Shopify checkout IDs
-- For these claims, shopify_checkout_id still contains our format (checkout_{timestamp})
-- which won't match Shopify's gid://shopify/Checkout/{id} format in future webhooks
UPDATE zero_dollar_claims 
SET status = 'cancelled'
WHERE shopify_order_id IS NULL 
AND status = 'created';

-- Verify the fixes
SELECT 
  id,
  user_id,
  status,
  shopify_order_id,
  claim_month,
  shopify_checkout_id,
  claimed_at
FROM zero_dollar_claims 
WHERE shopify_order_id IS NULL
ORDER BY claimed_at DESC;