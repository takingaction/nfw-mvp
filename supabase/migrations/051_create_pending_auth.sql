-- Create pending_auth table for MFA without immediate session
CREATE TABLE pending_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick email lookup
CREATE INDEX idx_pending_auth_email ON pending_auth(email);

-- Index for user lookup
CREATE INDEX idx_pending_auth_user_id ON pending_auth (user_id);

-- RLS - only service role can manage this table
ALTER TABLE pending_auth ENABLE ROW LEVEL SECURITY;

-- No public access - only server-side operations via service role key

NOTIFY pgrst, 'reload';