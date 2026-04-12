-- Add SEO fields to site_faq and site_contact tables

ALTER TABLE site_faq ADD COLUMN meta_title TEXT;
ALTER TABLE site_faq ADD COLUMN meta_description TEXT;

ALTER TABLE site_contact ADD COLUMN meta_title TEXT;
ALTER TABLE site_contact ADD COLUMN meta_description TEXT;

CREATE INDEX IF NOT EXISTS idx_site_faq_meta_title ON site_faq(meta_title);
CREATE INDEX IF NOT EXISTS idx_site_faq_meta_description ON site_faq(meta_description);
CREATE INDEX IF NOT EXISTS idx_site_contact_meta_title ON site_contact(meta_title);
CREATE INDEX IF NOT EXISTS idx_site_contact_meta_description ON site_contact(meta_description);