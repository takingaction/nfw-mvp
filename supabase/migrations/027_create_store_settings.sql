-- Create store_settings table for Zero Dollar Store hero configuration

CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_image_url TEXT,
  hero_heading TEXT DEFAULT 'ZERO DOLLAR STORE',
  hero_subheading TEXT DEFAULT 'Browse our selection',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row if not exists
INSERT INTO store_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM store_settings);

-- Helper to get current settings
CREATE OR REPLACE FUNCTION get_store_settings()
RETURNS TABLE(
  id UUID,
  hero_image_url TEXT,
  hero_heading TEXT,
  hero_subheading TEXT,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM store_settings LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
