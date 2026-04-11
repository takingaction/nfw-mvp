-- Migration: 030_create_site_contact.sql
-- Description: Create table for admin-editable Contact page content
-- Created: 2026-04-11

CREATE TABLE IF NOT EXISTS site_contact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_eyebrow TEXT DEFAULT 'Real people, real responses',
  hero_headline TEXT DEFAULT E'We''d love to hear from you.',
  hero_subheadline TEXT DEFAULT E'Whether you have a question, need support, or just want to say hi — we''re here and we''re listening.',
  help_heading TEXT DEFAULT 'How can we help?',
  help_intro TEXT DEFAULT 'Our team is made up of real women who care deeply about this community. We read every message and do our best to respond within one business day.',
  help_cards JSONB DEFAULT '[
    {
      "icon": "mail",
      "title": "Email us directly",
      "content": "We typically respond within one business day. For urgent grant-related questions, please note that in your message.",
      "email": "michelle@nationalfundforwomen.org"
    },
    {
      "icon": "clock",
      "title": "Response time",
      "content": "We typically respond within one business day. For urgent grant-related questions, please note that in your message."
    },
    {
      "icon": "heart",
      "title": "A note from us",
      "content": "No question is too small. Whether you need help with your account, have a grant question, or just want to share your story — we want to hear it."
    }
  ]',
  quick_links JSONB DEFAULT '[
    { "label": "Microgrant FAQs", "url": "/faq" },
    { "label": "Pricing and Plans", "url": "/pricing" },
    { "label": "Perks and Discounts", "url": "/perks/info" },
    { "label": "Apply for a Grant", "url": "/grants/apply" }
  ]',
  not_member_heading TEXT DEFAULT 'Not a member yet?',
  not_member_subheading TEXT DEFAULT E'Join thousands of women who have already found relief, connection, and real support through NFW. It''s free to get started.',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row if table is empty
INSERT INTO site_contact (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM site_contact);

CREATE INDEX IF NOT EXISTS idx_site_contact_updated_at ON site_contact(updated_at DESC);
