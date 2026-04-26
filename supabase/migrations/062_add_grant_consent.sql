-- Add consent columns to grants table
ALTER TABLE grants
ADD COLUMN consent_version TEXT DEFAULT 'v1',
ADD COLUMN consent_given_at TIMESTAMPTZ;