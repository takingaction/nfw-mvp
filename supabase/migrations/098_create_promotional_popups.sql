-- Create promotional_popups table
CREATE TABLE promotional_popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  cta_text TEXT,
  cta_url TEXT,
  target_pages TEXT[] DEFAULT '{}',
  frequency_type TEXT DEFAULT 'once' CHECK (frequency_type IN ('once', 'per_session', 'every_visit', 'limited', 'daily', 'weekly')),
  frequency_value INT DEFAULT 1,
  delay_seconds INT DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE promotional_popups ENABLE ROW LEVEL SECURITY;

-- Public can view active popups for API
CREATE POLICY "Anyone can view active popups"
  ON promotional_popups FOR SELECT
  USING (is_active = true);

-- Admin can do everything
CREATE POLICY "Admin can manage popups"
  ON promotional_popups FOR ALL
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promotional_popups_updated_at
  BEFORE UPDATE ON promotional_popups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Notify PostgREST
NOTIFY pgrst, 'reload';
