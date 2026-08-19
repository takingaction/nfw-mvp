-- Migration: Create UTM tables for link builder
-- Created: 2026-08-17

-- Channel table
CREATE TABLE IF NOT EXISTS utm_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources table
CREATE TABLE IF NOT EXISTS utm_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES utm_channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, slug)
);

-- Mediums table
CREATE TABLE IF NOT EXISTS utm_mediums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES utm_channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, slug)
);

-- Saved UTM links table
CREATE TABLE IF NOT EXISTS utm_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_url TEXT NOT NULL,
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  utm_content TEXT,
  utm_term TEXT,
  channel_id UUID REFERENCES utm_channels(id),
  channel_name TEXT,
  created_by UUID REFERENCES profiles(id),
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_utm_channels_active ON utm_channels(is_active);
CREATE INDEX IF NOT EXISTS idx_utm_channels_display_order ON utm_channels(display_order);
CREATE INDEX IF NOT EXISTS idx_utm_sources_channel ON utm_sources(channel_id);
CREATE INDEX IF NOT EXISTS idx_utm_mediums_channel ON utm_mediums(channel_id);
CREATE INDEX IF NOT EXISTS idx_utm_links_created_at ON utm_links(created_at);
CREATE INDEX IF NOT EXISTS idx_utm_links_created_by ON utm_links(created_by);

-- RLS
ALTER TABLE utm_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_mediums ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_links ENABLE ROW LEVEL SECURITY;

-- Channels: public read, admin write
CREATE POLICY "Anyone can view active channels"
  ON utm_channels FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage channels"
  ON utm_channels FOR ALL
  USING (auth.role() = 'authenticated');

-- Sources: public read, admin write
CREATE POLICY "Anyone can view sources"
  ON utm_sources FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sources"
  ON utm_sources FOR ALL
  USING (auth.role() = 'authenticated');

-- Mediums: public read, admin write
CREATE POLICY "Anyone can view mediums"
  ON utm_mediums FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage mediums"
  ON utm_mediums FOR ALL
  USING (auth.role() = 'authenticated');

-- Links: admin read/write only
CREATE POLICY "Admins can manage utm links"
  ON utm_links FOR ALL
  USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload';

-- Seed default channels with sources and mediums
INSERT INTO utm_channels (name, slug, display_order) VALUES
  ('Social', 'social', 1),
  ('Email', 'email', 2),
  ('Partner', 'partner', 3),
  ('Paid Ads', 'paid_ads', 4),
  ('Website Popup', 'website_popup', 5)
ON CONFLICT (slug) DO NOTHING;

-- Seed sources for each channel
INSERT INTO utm_sources (channel_id, name, slug) 
SELECT c.id, s.name, s.slug FROM utm_channels c
CROSS JOIN (VALUES
  ('social', 'facebook', 'facebook'),
  ('social', 'instagram', 'instagram'),
  ('social', 'linkedin', 'linkedin'),
  ('social', 'twitter_x', 'twitter_x'),
  ('social', 'tiktok', 'tiktok'),
  ('social', 'pinterest', 'pinterest'),
  ('social', 'youtube', 'youtube'),
  ('social', 'threads', 'threads'),
  ('email', 'resend', 'resend'),
  ('email', 'drip_prospects', 'drip_prospects'),
  ('email', 'drip_members', 'drip_members'),
  ('email', 'drip_founding', 'drip_founding'),
  ('email', 'drip_incomplete', 'drip_incomplete'),
  ('email', 'drip_waitlist', 'drip_waitlist'),
  ('email', 'drip_contributing', 'drip_contributing'),
  ('email', 'reengagement_members', 'reengagement_members'),
  ('email', 'renewal_members', 'renewal_members'),
  ('email', 'renewal_contributing', 'renewal_contributing'),
  ('email', 'renewal_founding', 'renewal_founding'),
  ('partner', 'partner_referral', 'partner_referral'),
  ('partner', 'member_referral', 'member_referral'),
  ('partner', 'board_referral', 'board_referral'),
  ('paid_ads', 'google', 'google'),
  ('paid_ads', 'facebook', 'facebook'),
  ('paid_ads', 'instagram', 'instagram'),
  ('paid_ads', 'linkedin', 'linkedin'),
  ('paid_ads', 'tiktok', 'tiktok'),
  ('paid_ads', 'youtube', 'youtube'),
  ('website_popup', 'exit_intent', 'exit_intent'),
  ('website_popup', 'newsletter_signup', 'newsletter_signup'),
  ('website_popup', 'announcement_bar', 'announcement_bar'),
  ('website_popup', 'promo_banner', 'promo_banner'),
  ('website_popup', 'welcome_mat', 'welcome_mat'),
  ('website_popup', 'scroll_triggered', 'scroll_triggered')
) AS s(channel_slug, name, slug)
JOIN utm_channels c ON c.slug = s.channel_slug
ON CONFLICT (channel_id, slug) DO NOTHING;

-- Seed mediums for each channel
INSERT INTO utm_mediums (channel_id, name, slug)
SELECT c.id, m.name, m.slug FROM utm_channels c
CROSS JOIN (VALUES
  ('social', 'Social', 'social'),
  ('social', 'Paid Social', 'paid_social'),
  ('email', 'Email', 'email'),
  ('partner', 'Partner', 'partner'),
  ('partner', 'Referral', 'referral'),
  ('partner', 'Creator', 'creator'),
  ('paid_ads', 'CPC', 'cpc'),
  ('paid_ads', 'Paid Social', 'paid_social'),
  ('paid_ads', 'Display', 'display'),
  ('website_popup', 'Popup', 'popup'),
  ('website_popup', 'Onsite', 'onsite'),
  ('website_popup', 'Modal', 'modal')
) AS m(channel_slug, name, slug)
JOIN utm_channels c ON c.slug = m.channel_slug
ON CONFLICT (channel_id, slug) DO NOTHING;
