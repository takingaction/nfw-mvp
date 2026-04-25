-- Login rate limiting table
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT FALSE,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookup of recent failed attempts by email
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_recent 
  ON login_attempts(email, attempted_at DESC) 
  WHERE success = FALSE;

-- Index for cleanup old records
CREATE INDEX IF NOT EXISTS idx_login_attempts_old 
  ON login_attempts(attempted_at);

-- Enable RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert (for tracking)
CREATE POLICY "Service role can insert login attempts"
  ON login_attempts FOR INSERT
  WITH CHECK (true);

-- Allow service role to read (for rate limit checks)
CREATE POLICY "Service role can read login attempts"
  ON login_attempts FOR SELECT
  USING (true);

-- Allow service role to delete (for cleanup)
CREATE POLICY "Service role can delete login attempts"
  ON login_attempts FOR DELETE
  USING (true);
