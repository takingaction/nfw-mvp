-- Add MFA verification columns to pending_auth
ALTER TABLE pending_auth 
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mfa_skip_until TIMESTAMPTZ;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_pending_auth_verified ON pending_auth(email, verified_at);
CREATE INDEX IF NOT EXISTS idx_pending_auth_skip ON pending_auth(email, mfa_skip_until);
