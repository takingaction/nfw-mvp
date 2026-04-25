-- Create otp_codes table for custom numeric OTP via Resend
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick email lookup
CREATE INDEX idx_otp_codes_email ON otp_codes(email);

-- Index for cleanup queries
CREATE INDEX idx_otp_codes_expires ON otp_codes(expires_at);

-- RLS policies for otp_codes table
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- No public access - only server-side operations via service role key
-- Users don't read/write their own OTP codes directly

NOTIFY pgrst, 'reload';