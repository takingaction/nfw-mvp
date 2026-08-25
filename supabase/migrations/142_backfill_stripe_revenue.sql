-- ============================================
-- Migration: Backfill Stripe Revenue Tracking (Phase 1 - SQL)
-- Purpose: Populate signup_source, previous_membership_level, lifetime_value for gift card members
-- ============================================

-- ============================================
-- STEP 1: Set signup_source
-- ============================================

-- Gift card members: signup_source = 'gift'
UPDATE profiles
SET signup_source = 'gift'
WHERE membership_level IN ('contributing', 'founding')
  AND gift_code_redeemed = TRUE
  AND (signup_source IS NULL OR signup_source = 'unknown');

-- Stripe-paid members: signup_source = 'stripe'
UPDATE profiles
SET signup_source = 'stripe'
WHERE membership_level IN ('contributing', 'founding')
  AND (signup_source IS NULL OR signup_source = 'unknown');

-- ============================================
-- STEP 2: Set previous_membership_level
-- ============================================

-- Stripe-paid members who upgraded: 'free' (they went free → paid via Stripe)
-- Gift card members and direct signups: NULL (no previous paid tier)
UPDATE profiles
SET previous_membership_level = 'free'
WHERE membership_level IN ('contributing', 'founding')
  AND signup_source = 'stripe'
  AND previous_membership_level IS NULL;

-- ============================================
-- STEP 3: Calculate lifetime_value for gift card members
-- ============================================

-- For gift card members: use gift_membership_purchases to calculate
-- Each purchase has total_amount / quantity = per-code value
UPDATE profiles p
SET lifetime_value = gp.total_value
FROM (
  SELECT 
    gmc.redeemed_by_user_id,
    SUM(gmp.total_amount::NUMERIC / NULLIF(gmp.quantity, 0)) as total_value
  FROM gift_membership_codes gmc
  JOIN gift_membership_purchases gmp ON gmc.purchase_id = gmp.id
  WHERE gmc.redeemed_by_user_id IS NOT NULL
    AND gmc.redeemed_at IS NOT NULL
  GROUP BY gmc.redeemed_by_user_id
) gp
WHERE p.id = gp.redeemed_by_user_id
  AND p.lifetime_value = 0;

-- ============================================
-- STEP 4: Notify PostgREST
-- ============================================

NOTIFY pgrst, 'reload';

-- ============================================
-- VERIFY: Run these to check results
-- ============================================
-- SELECT signup_source, COUNT(*) FROM profiles WHERE membership_level IN ('contributing', 'founding') GROUP BY signup_source;
-- SELECT previous_membership_level, COUNT(*) FROM profiles WHERE membership_level IN ('contributing', 'founding') AND previous_membership_level IS NOT NULL GROUP BY previous_membership_level;
-- SELECT COUNT(*) as gift_lifetime_set FROM profiles WHERE lifetime_value > 0;
