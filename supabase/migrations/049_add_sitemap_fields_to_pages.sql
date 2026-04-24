-- Migration: Add include_in_sitemap field to pages table
-- Created: 2026-04-25

ALTER TABLE pages ADD COLUMN include_in_sitemap BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_pages_include_in_sitemap ON pages(include_in_sitemap) WHERE include_in_sitemap = TRUE;
