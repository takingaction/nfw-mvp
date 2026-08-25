-- ============================================
-- Migration: Create Stripe Backfill Status Table
-- Purpose: Track backfill progress for stripe_customer_id and lifetime_value
-- ============================================

CREATE TABLE IF NOT EXISTS stripe_backfill_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'matched', 'not_found', 'error')),
  stripe_customer_id TEXT,
  lifetime_value NUMERIC(10,2),
  error_message TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backfill_status_profile_id ON stripe_backfill_status(profile_id);
CREATE INDEX IF NOT EXISTS idx_backfill_status_status ON stripe_backfill_status(status);
CREATE INDEX IF NOT EXISTS idx_backfill_status_email ON stripe_backfill_status(email);

-- Enable RLS
ALTER TABLE stripe_backfill_status ENABLE ROW LEVEL SECURITY;

-- Admin users can view all backfill status
CREATE POLICY "Admin users can view stripe backfill status"
  ON stripe_backfill_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role can do everything (bypasses RLS)
CREATE POLICY "Service role can manage stripe backfill status"
  ON stripe_backfill_status FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

NOTIFY pgrst, 'reload';
