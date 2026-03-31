-- Fix site_footer table - add missing columns from new schema
-- This migrates data from old schema to new schema

-- Add new columns if they don't exist
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS column1_heading TEXT DEFAULT 'MEMBERSHIP';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS column1_links JSONB DEFAULT '[{"label":"Become a Member","url":"/auth/sign-up"},{"label":"Perks & Discounts","url":"/perks/info"},{"label":"Microgrants","url":"/grants"},{"label":"Zero Dollar Store","url":"/store"}]';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS column2_heading TEXT DEFAULT 'COMMUNITY';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS column2_links JSONB DEFAULT '[{"label":"Become a Member","url":"/auth/sign-up"},{"label":"Perks & Discounts","url":"/perks/info"},{"label":"Microgrants","url":"/grants"},{"label":"Zero Dollar Store","url":"/store"}]';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS column3_heading TEXT DEFAULT 'ORGANIZATION';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS column3_links JSONB DEFAULT '[{"label":"Become a Member","url":"/auth/sign-up"},{"label":"Perks & Discounts","url":"/perks/info"},{"label":"Microgrants","url":"/grants"},{"label":"Zero Dollar Store","url":"/store"}]';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS copyright_text TEXT DEFAULT '© 2026 National Fund for Women. All rights reserved.';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS footer_link1_text TEXT DEFAULT 'Privacy Policy';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS footer_link1_url TEXT DEFAULT '/privacy';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS footer_link2_text TEXT DEFAULT 'Terms of Use';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS footer_link2_url TEXT DEFAULT '/terms';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS footer_link3_text TEXT DEFAULT 'Accessibility';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS footer_link3_url TEXT DEFAULT '/accessibility';

-- Update existing row with new values (use COALESCE to preserve existing data)
UPDATE site_footer SET
  column1_heading = COALESCE(NULLIF(column1_heading, ''), 'MEMBERSHIP'),
  column1_links = COALESCE(column1_links, '[
    {"label":"Become a Member","url":"/auth/sign-up"},
    {"label":"Perks & Discounts","url":"/perks/info"},
    {"label":"Microgrants","url":"/grants"},
    {"label":"Zero Dollar Store","url":"/store"}
  ]'::jsonb),
  column2_heading = COALESCE(NULLIF(column2_heading, ''), 'COMMUNITY'),
  column2_links = COALESCE(column2_links, '[
    {"label":"Become a Member","url":"/auth/sign-up"},
    {"label":"Perks & Discounts","url":"/perks/info"},
    {"label":"Microgrants","url":"/grants"},
    {"label":"Zero Dollar Store","url":"/store"}
  ]'::jsonb),
  column3_heading = COALESCE(NULLIF(column3_heading, ''), 'ORGANIZATION'),
  column3_links = COALESCE(column3_links, '[
    {"label":"Become a Member","url":"/auth/sign-up"},
    {"label":"Perks & Discounts","url":"/perks/info"},
    {"label":"Microgrants","url":"/grants"},
    {"label":"Zero Dollar Store","url":"/store"}
  ]'::jsonb),
  copyright_text = COALESCE(NULLIF(copyright_text, ''), '© 2026 National Fund for Women. All rights reserved.'),
  footer_link1_text = COALESCE(NULLIF(footer_link1_text, ''), 'Privacy Policy'),
  footer_link1_url = COALESCE(NULLIF(footer_link1_url, ''), '/privacy'),
  footer_link2_text = COALESCE(NULLIF(footer_link2_text, ''), 'Terms of Use'),
  footer_link2_url = COALESCE(NULLIF(footer_link2_url, ''), '/terms'),
  footer_link3_text = COALESCE(NULLIF(footer_link3_text, ''), 'Accessibility'),
  footer_link3_url = COALESCE(NULLIF(footer_link3_url, ''), '/accessibility'),
  logo_url = COALESCE(NULLIF(logo_url, ''), '/images/footer-logo.png')
WHERE id = (SELECT id FROM site_footer LIMIT 1);
