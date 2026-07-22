-- Migration: Add show_nfw_exclusive_button to site_settings
-- Created: 2026-07-21

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS show_nfw_exclusive_button BOOLEAN DEFAULT false;

-- Update existing row if the column was just added
UPDATE site_settings
SET show_nfw_exclusive_button = false
WHERE id = '00000000-0000-0000-0000-000000000001'
AND show_nfw_exclusive_button IS NULL;

NOTIFY pgrst, 'reload';
