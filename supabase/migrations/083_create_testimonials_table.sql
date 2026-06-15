-- Create testimonials table for Share Your Story feature
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  age TEXT NOT NULL,
  city TEXT,
  state TEXT,
  drawn_to_membership TEXT,
  programs_engaged TEXT,
  favorite_part TEXT,
  how_nfw_helped TEXT,
  why_join TEXT,
  permission_granted BOOLEAN NOT NULL DEFAULT false,
  prefer_anonymous BOOLEAN DEFAULT false,
  interested_video BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Users can insert their own story
CREATE POLICY "Users can submit their own story"
  ON testimonials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own story
CREATE POLICY "Users can view their own story"
  ON testimonials FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all stories
CREATE POLICY "Admins can manage all stories"
  ON testimonials FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials(status);
CREATE INDEX IF NOT EXISTS idx_testimonials_created_at ON testimonials(created_at);
CREATE INDEX IF NOT EXISTS idx_testimonials_user_id ON testimonials(user_id);

NOTIFY pgrst, 'reload';