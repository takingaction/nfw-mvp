-- Create perks_settings table for banner configuration
CREATE TABLE perks_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_image_url TEXT,
  hero_heading TEXT DEFAULT 'Member Perks',
  hero_subheading TEXT DEFAULT 'Exclusive discounts and offers for NFW members',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default row
INSERT INTO perks_settings (hero_heading, hero_subheading)
VALUES ('Member Perks', 'Exclusive discounts and offers for NFW members')
ON CONFLICT DO NOTHING;

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload';
