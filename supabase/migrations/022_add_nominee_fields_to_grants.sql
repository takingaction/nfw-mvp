-- Migration: Add nominee fields to grants table
-- Created: 2026-04-05

ALTER TABLE grants 
ADD COLUMN nominee_name TEXT,
ADD COLUMN nominee_email TEXT;

-- Index for querying by nominee email
CREATE INDEX IF NOT EXISTS idx_grants_nominee_email ON grants(nominee_email);
