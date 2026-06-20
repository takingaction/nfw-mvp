-- Create NFW Exclusive Perks table
CREATE TABLE nfw_perks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  partner_name TEXT,
  partner_logo_url TEXT,
  discount_type TEXT CHECK (discount_type IN ('percent', 'fixed', 'free_item', 'landing_page')),
  discount_value TEXT,
  landing_page_url TEXT,
  per_user_limit INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  categories TEXT[] DEFAULT '{}',
  featured_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Redemptions tracking
CREATE TABLE nfw_perk_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perk_id UUID REFERENCES nfw_perks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(perk_id, user_id)
);

-- Indexes
CREATE INDEX idx_nfw_perks_active ON nfw_perks(is_active) WHERE is_active = true;
CREATE INDEX idx_nfw_perks_categories ON nfw_perks USING GIN(categories);
CREATE INDEX idx_nfw_perks_redemptions_perk ON nfw_perk_redemptions(perk_id);
CREATE INDEX idx_nfw_perks_redemptions_user ON nfw_perk_redemptions(user_id);
CREATE INDEX idx_nfw_perks_featured_order ON nfw_perks(featured_order) WHERE featured_order IS NOT NULL;

-- Enable RLS
ALTER TABLE nfw_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfw_perk_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for nfw_perks
CREATE POLICY "Public read access to active perks" ON nfw_perks
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access to perks" ON nfw_perks
  FOR ALL USING (true);

-- RLS policies for nfw_perk_redemptions
CREATE POLICY "Users can view their own redemptions" ON nfw_perk_redemptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own redemptions" ON nfw_perk_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all redemptions" ON nfw_perk_redemptions
  FOR SELECT USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nfw_perks_updated_at
  BEFORE UPDATE ON nfw_perks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Notify PostgREST of schema change
NOTIFY pgrst, 'reload';
