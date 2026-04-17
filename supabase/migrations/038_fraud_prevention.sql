-- Migration: 038_fraud_prevention.sql
-- Description: Add duplicate prevention for Access Perks redemptions and Zero Dollar Store claims
-- Created: 2026-04-17

-- =============================================================================
-- ACCESS PERKS - Prevent duplicate offer redemptions
-- =============================================================================

-- Add unique constraint to prevent same user redeeming same offer multiple times
-- Note: If existing data has duplicates, this will fail. Run cleanup first if needed:
-- DELETE FROM offer_redemptions o1 USING offer_redemptions o2
-- WHERE o1.id < o2.id AND o1.user_id = o2.user_id AND o1.offer_key = o2.offer_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_offer_redemptions_user_offer
    ON offer_redemptions(user_id, offer_key)
    WHERE status = 'active';

COMMENT ON INDEX idx_offer_redemptions_user_offer IS 'Prevent duplicate active redemptions of same offer by same user';

-- =============================================================================
-- ZERO DOLLAR STORE - Add unique constraint for lifetime product limit
-- =============================================================================

-- Add unique constraint to prevent same user claiming same product multiple times (lifetime)
CREATE UNIQUE INDEX IF NOT EXISTS idx_zero_dollar_claims_user_product
    ON zero_dollar_claims(user_id, shopify_product_id);

COMMENT ON INDEX idx_zero_dollar_claims_user_product IS 'Prevent same user from claiming same product multiple times (lifetime limit)';

-- =============================================================================
-- ZERO DOLLAR STORE - Add monthly claim tracking table
-- =============================================================================

-- Track monthly claims per user to enforce 1 claim per month limit
CREATE TABLE IF NOT EXISTS monthly_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    claim_month DATE NOT NULL, -- First day of the month (e.g., '2026-04-01')
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_claim_month UNIQUE (user_id, claim_month)
);

CREATE INDEX idx_monthly_claims_user_month ON monthly_claims(user_id, claim_month);

COMMENT ON TABLE monthly_claims IS 'Track monthly claims per user for 1-per-month limit enforcement';
