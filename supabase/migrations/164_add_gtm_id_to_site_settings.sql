-- Migration: Add gtm_id to site_settings
-- Stores Google Tag Manager container ID (format: GTM-XXXXXXX)

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS gtm_id TEXT;

NOTIFY pgrst, 'reload';
