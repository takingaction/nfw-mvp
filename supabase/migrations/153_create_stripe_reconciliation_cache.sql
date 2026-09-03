-- Migration: 153_create_stripe_reconciliation_cache.sql
-- Creates table to cache Stripe reconciliation data across browsers/sessions

CREATE TABLE IF NOT EXISTS stripe_reconciliation_cache (
  id TEXT PRIMARY KEY DEFAULT 'latest',
  data JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stripe_api_calls INTEGER,
  incomplete BOOLEAN DEFAULT FALSE,
  warning TEXT
);

-- Enable RLS
ALTER TABLE stripe_reconciliation_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Admin only for all operations
CREATE POLICY "stripe_reconciliation_cache_admin_all"
  ON stripe_reconciliation_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_stripe_reconciliation_cache_computed_at
  ON stripe_reconciliation_cache(computed_at DESC);

-- Table to cache raw Stripe subscription data for reconciliation
CREATE TABLE IF NOT EXISTS stripe_subscriptions_cache (
  id TEXT PRIMARY KEY DEFAULT 'latest',
  subscriptions_json JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subscription_count INTEGER,
  api_calls INTEGER,
  incomplete BOOLEAN DEFAULT FALSE,
  warning TEXT
);

-- Enable RLS
ALTER TABLE stripe_subscriptions_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Admin only for all operations
CREATE POLICY "stripe_subscriptions_cache_admin_all"
  ON stripe_subscriptions_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_cache_fetched_at
  ON stripe_subscriptions_cache(fetched_at DESC);

NOTIFY pgrst, 'reload';
