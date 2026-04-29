-- Migration: Enable RLS on public-facing tables
-- Date: 2026-04-28
-- Purpose: Address Supabase database linter warnings for RLS disabled tables

-- ============================================
-- site_faq
-- ============================================
ALTER TABLE site_faq ENABLE ROW LEVEL SECURITY;

-- Anyone can read FAQ content (public)
CREATE POLICY "Anyone can read FAQ"
  ON site_faq FOR SELECT
  USING (true);

-- Admin updates via API (service role bypasses RLS anyway)
-- No insert policy needed - admin-only content

-- ============================================
-- site_contact
-- ============================================
ALTER TABLE site_contact ENABLE ROW LEVEL SECURITY;

-- Anyone can read contact page content (public)
CREATE POLICY "Anyone can read contact content"
  ON site_contact FOR SELECT
  USING (true);

-- ============================================
-- store_settings
-- ============================================
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Admin read access
CREATE POLICY "Admin can view store settings"
  ON store_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admin write access (service role bypasses RLS anyway)
CREATE POLICY "Admin can update store settings"
  ON store_settings FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ============================================
-- coming_soon_emails
-- ============================================
ALTER TABLE coming_soon_emails ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (public signup form)
CREATE POLICY "Anyone can subscribe"
  ON coming_soon_emails FOR INSERT
  WITH CHECK (true);

-- Admins can view all subscribers
CREATE POLICY "Admin can view subscribers"
  ON coming_soon_emails FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- contact_submissions
-- ============================================
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit contact form (public)
CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions FOR INSERT
  WITH CHECK (true);

-- Admins can view submissions
CREATE POLICY "Admin can view contact submissions"
  ON contact_submissions FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- gift_membership_purchases
-- ============================================
ALTER TABLE gift_membership_purchases ENABLE ROW LEVEL SECURITY;

-- Admin read access
CREATE POLICY "Admin can view gift purchases"
  ON gift_membership_purchases FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admin write access (service role bypasses RLS anyway)
CREATE POLICY "Admin can update gift purchases"
  ON gift_membership_purchases FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ============================================
-- Notify PostgREST to reload schema cache
-- ============================================
NOTIFY pgrst, 'reload';