-- Create legal_pages table
CREATE TABLE IF NOT EXISTS legal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  termly_embed_code TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial rows
INSERT INTO legal_pages (slug, title) VALUES
  ('privacy', 'Privacy Policy'),
  ('terms-of-service', 'Terms of Service'),
  ('accessibility', 'Accessibility')
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS
ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read
CREATE POLICY "Anyone can read legal pages"
  ON legal_pages FOR SELECT USING (true);

-- Policy: only admins can update
CREATE POLICY "Only admins can update legal pages"
  ON legal_pages FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

NOTIFY pgrst, 'reload';