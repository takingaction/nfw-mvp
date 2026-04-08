-- Add Column 4 (Connect) and social media links to site_footer table

-- Add Column 4
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS column4_heading TEXT DEFAULT 'CONNECT';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS column4_links JSONB DEFAULT '[]';

-- Add social media URLs
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS social_instagram TEXT DEFAULT 'https://www.instagram.com/nationalfundforwomen';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS social_tiktok TEXT DEFAULT 'https://www.tiktok.com/@nationalfundforwomen';
ALTER TABLE site_footer ADD COLUMN IF NOT EXISTS social_facebook TEXT DEFAULT 'https://www.facebook.com/nationalfundforwomen';

-- Update existing row with new values
UPDATE site_footer SET
  column4_heading = COALESCE(NULLIF(column4_heading, ''), 'CONNECT'),
  column4_links = COALESCE(column4_links, '[]'::jsonb),
  social_instagram = COALESCE(NULLIF(social_instagram, ''), 'https://www.instagram.com/nationalfundforwomen'),
  social_tiktok = COALESCE(NULLIF(social_tiktok, ''), 'https://www.tiktok.com/@nationalfundforwomen'),
  social_facebook = COALESCE(NULLIF(social_facebook, ''), 'https://www.facebook.com/nationalfundforwomen')
WHERE id = (SELECT id FROM site_footer LIMIT 1);