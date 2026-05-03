-- Migration: Add RLS to site_settings table
-- Created: 2026-05-03
-- Purpose: Add row-level security to site_settings for consistency with other site tables

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings viewable by everyone"
  ON site_settings FOR SELECT USING (true);

CREATE POLICY "Site settings editable by admins"
  ON site_settings FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

NOTIFY pgrst, 'reload';