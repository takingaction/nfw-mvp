-- Migration: Create site_settings table for site-wide configuration
-- Created: 2026-04-25

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robots_txt TEXT DEFAULT 'User-agent: *
Allow: /',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_site_settings_single_row ON site_settings((true));

COMMENT ON TABLE site_settings IS 'Site-wide settings including robots.txt content';

INSERT INTO site_settings (id, robots_txt)
SELECT '00000000-0000-0000-0000-000000000001', 'User-agent: *
Allow: /'
WHERE NOT EXISTS (
  SELECT 1 FROM site_settings WHERE id = '00000000-0000-0000-0000-000000000001'
);
