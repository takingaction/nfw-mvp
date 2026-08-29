-- Migration: 149_create_site_signup.sql
-- Creates site_signup table for editable signup page sidebar content
-- Run in Supabase SQL Editor

CREATE TABLE site_signup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eyebrow TEXT NOT NULL DEFAULT 'JOIN WOMEN NATIONWIDE',
  headline TEXT NOT NULL DEFAULT 'Become a Member',
  body_text TEXT DEFAULT 'NFW membership helps you get relief for yourself while helping other women at the same time. Membership includes:',
  benefits JSONB DEFAULT '[
    "Microgrants from $100-$5,000",
    "Thousands of perks & discounts",
    "Zero Dollar Store giveaways",
    "Feel-good support that is simple, fast and low stress",
    "A community that gets it",
    "A mission-driven community supporting women"
  ]'::jsonb,
  testimonial_text TEXT DEFAULT '"NFW is a safe space where we can trust that the women here have one another''s back. We support one another''s growth, hopes, and dreams even though they aren''t our own. We know that when one of us rises, the rest of us are right there supporting her. NFW is the space all women have been looking for."',
  testimonial_author TEXT DEFAULT 'Tiana, 29 — Retail Manager',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE site_signup ENABLE ROW LEVEL SECURITY;

-- Public can read
CREATE POLICY "Site signup is viewable by everyone"
  ON site_signup FOR SELECT
  USING (true);

-- Admin can insert/update
CREATE POLICY "Admins can manage site signup"
  ON site_signup FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Seed default row
INSERT INTO site_signup DEFAULT VALUES;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION sync_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_signup_updated_at
  BEFORE UPDATE ON site_signup
  FOR EACH ROW
  EXECUTE FUNCTION sync_updated_at_column();

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
