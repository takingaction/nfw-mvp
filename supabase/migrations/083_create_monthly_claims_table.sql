-- Create monthly_claims table for tracking monthly Zero Dollar Store claims
-- One claim per user per month is enforced via unique index

CREATE TABLE IF NOT EXISTS monthly_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  shopify_product_id TEXT NOT NULL,
  claim_month TEXT NOT NULL, -- Format: "YYYY-MM-01"
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index to prevent duplicate monthly claims (race condition fix)
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_claims_user_month
ON monthly_claims(user_id, claim_month);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_monthly_claims_user_id ON monthly_claims(user_id);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_monthly_claims_claimed_at ON monthly_claims(claimed_at);

NOTIFY pgrst, 'reload';