-- Create site_footer table for admin-editable footer content
CREATE TABLE site_footer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT DEFAULT '/images/footer-logo.png',
  column1_heading TEXT DEFAULT 'MEMBERSHIP',
  column1_links JSONB DEFAULT '[{"label":"Become a Member","url":"/auth/sign-up"},{"label":"Perks & Discounts","url":"/perks/info"},{"label":"Microgrants","url":"/grants"},{"label":"Zero Dollar Store","url":"/store"}]',
  column2_heading TEXT DEFAULT 'COMMUNITY',
  column2_links JSONB DEFAULT '[{"label":"Become a Member","url":"/auth/sign-up"},{"label":"Perks & Discounts","url":"/perks/info"},{"label":"Microgrants","url":"/grants"},{"label":"Zero Dollar Store","url":"/store"}]',
  column3_heading TEXT DEFAULT 'ORGANIZATION',
  column3_links JSONB DEFAULT '[{"label":"Become a Member","url":"/auth/sign-up"},{"label":"Perks & Discounts","url":"/perks/info"},{"label":"Microgrants","url":"/grants"},{"label":"Zero Dollar Store","url":"/store"}]',
  copyright_text TEXT DEFAULT '© 2026 National Fund for Women. All rights reserved.',
  footer_link1_text TEXT DEFAULT 'Privacy Policy',
  footer_link1_url TEXT DEFAULT '/privacy',
  footer_link2_text TEXT DEFAULT 'Terms of Use',
  footer_link2_url TEXT DEFAULT '/terms',
  footer_link3_text TEXT DEFAULT 'Accessibility',
  footer_link3_url TEXT DEFAULT '/accessibility',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default footer row
INSERT INTO site_footer DEFAULT VALUES;
