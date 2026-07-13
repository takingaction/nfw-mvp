-- Migration: 115_add_pending_monthly_claims.sql
-- Purpose: Add atomic lock table to prevent duplicate checkout creation
-- This table acts as a "checkout in progress" lock at the database level

BEGIN;

-- Create pending_monthly_claims table with unique constraint on (user_id, claim_month)
-- This unique constraint is the ATOMIC LOCK that prevents race conditions
CREATE TABLE IF NOT EXISTS pending_monthly_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  claim_month TEXT NOT NULL,  -- Format: "YYYY-MM-01"
  shopify_product_id TEXT NOT NULL,
  shopify_variant_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_claim_month UNIQUE (user_id, claim_month)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_pending_monthly_claims_user_month
  ON pending_monthly_claims(user_id, claim_month);

-- Index for cleanup queries (finding stale pending claims)
CREATE INDEX IF NOT EXISTS idx_pending_monthly_claims_created_at
  ON pending_monthly_claims(created_at);

-- Add RLS policies (service role key bypasses RLS anyway, but good practice)
ALTER TABLE pending_monthly_claims ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (bypasses RLS)
CREATE POLICY "Service role can do everything on pending_monthly_claims"
  ON pending_monthly_claims
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Notify PostREST of schema change
NOTIFY pgrst, 'reload';

COMMIT;
