-- Migration: Add SEO fields to pages table
-- Created: 2026-04-04

ALTER TABLE pages 
ADD COLUMN meta_title TEXT,
ADD COLUMN meta_description TEXT;

-- Create indexes for SEO fields (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_pages_meta_title ON pages(meta_title);
CREATE INDEX IF NOT EXISTS idx_pages_meta_description ON pages(meta_description);
