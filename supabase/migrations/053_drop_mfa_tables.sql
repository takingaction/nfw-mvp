-- Drop MFA-related tables
DROP TABLE IF EXISTS otp_codes;
DROP TABLE IF EXISTS pending_auth;

-- Also drop the auth/mfa directory if it exists
DROP TABLE IF EXISTS login_attempts;
