-- Create abandoned_checkouts table to track incomplete Stripe checkouts
CREATE TABLE abandoned_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  membership_level TEXT NOT NULL CHECK (membership_level IN ('contributing', 'founding')),
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  checkout_url TEXT,
  email_sent_at TIMESTAMPTZ,
  email_retry_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE abandoned_checkouts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own abandoned checkouts (API routes use auth.uid())
CREATE POLICY "Users can view their own abandoned checkouts"
  ON abandoned_checkouts FOR SELECT
  USING (auth.uid() = user_id);

-- Note: INSERT/UPDATE/DELETE are handled by webhook via supabaseAdmin (bypasses RLS)
-- No need for INSERT policy since webhook uses service role key
-- No need for UPDATE policy since webhook uses service role key

-- Index for finding user's abandoned checkout
CREATE INDEX idx_abandoned_checkouts_user_id ON abandoned_checkouts(user_id);

-- Index for finding pending email sends
CREATE INDEX idx_abandoned_checkouts_pending_email ON abandoned_checkouts(email_sent_at, email_retry_at)
  WHERE recovered_at IS NULL AND email_sent_at IS NULL;

-- Index for cleanup job to find old records
CREATE INDEX idx_abandoned_checkouts_created_at ON abandoned_checkouts(created_at)
  WHERE recovered_at IS NULL;

-- Only allow one active abandoned checkout per user at a time
CREATE UNIQUE INDEX idx_abandoned_checkouts_user_active
  ON abandoned_checkouts(user_id)
  WHERE recovered_at IS NULL;

NOTIFY pgrst, 'reload';