-- Migration: 028_create_coming_soon_emails.sql
-- Description: Create table to store coming soon page email signups
-- Created: 2026-04-10

CREATE TABLE IF NOT EXISTS coming_soon_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_coming_soon_emails_email ON coming_soon_emails(email);
CREATE INDEX IF NOT EXISTS idx_coming_soon_emails_created_at ON coming_soon_emails(created_at DESC);

-- Insert default empty row if table is empty (for consistency)
INSERT INTO coming_soon_emails (id, email)
SELECT gen_random_uuid(), 'placeholder@placeholder.com'
WHERE NOT EXISTS (SELECT 1 FROM coming_soon_emails);

-- Remove the placeholder
DELETE FROM coming_soon_emails WHERE email = 'placeholder@placeholder.com';
