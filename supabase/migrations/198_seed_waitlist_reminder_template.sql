-- Migration: 198_seed_waitlist_reminder_template.sql
--
-- Seeds the `waitlist-reminder` email template and copies sections from
-- the existing `welcome-free` template as a starting point.
--
-- Because `welcome-free` sections live only in the live database (they were
-- built via /admin/emails and never seeded by migration), this DO $$ block
-- reads them at deploy time. After this migration runs, admin must:
--   1. Visit /admin/emails/waitlist-reminder/builder
--   2. Customize copy and add the {{acceptUrl}} CTA button
--   3. Click Publish
--   4. Toggle is_active = true on /admin/emails/waitlist-reminder
--
-- Until then the template renders as a copy of welcome-free without the
-- {{acceptUrl}} wired up, but the cron pre-flight check skips inactive
-- templates so no emails go out accidentally.

DO $$
DECLARE
  source_template_id UUID;
  new_template_id    UUID;
  sec RECORD;
BEGIN
  -- Get the welcome-free template id
  SELECT id INTO source_template_id FROM email_templates WHERE slug = 'welcome-free';
  IF NOT FOUND THEN
    RAISE NOTICE 'welcome-free template not found; skipping section copy.';
  END IF;

  -- Insert the new waitlist-reminder template.
  -- is_active = false so cron won't send until admin enables it.
  -- status = 'draft' so publish flow requires explicit admin action.
  INSERT INTO email_templates (slug, name, category, description, subject, is_active, status)
  VALUES (
    'waitlist-reminder',
    'Waitlist Reminder',
    'resend',
    'Sent 23 days after waitlist approval if member has not clicked their acceptance link. Reminds them of 7 days remaining.',
    'You have 7 days left to claim your free NFW membership',
    false,
    'draft'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO new_template_id;

  -- If template already exists (re-running migration), fetch its id
  IF new_template_id IS NULL THEN
    SELECT id INTO new_template_id FROM email_templates WHERE slug = 'waitlist-reminder';
  END IF;

  -- Copy sections from welcome-free if source exists.
  -- Always delete existing sections first so re-running this migration
  -- produces a clean copy (idempotent).
  IF source_template_id IS NOT NULL AND new_template_id IS NOT NULL THEN
    DELETE FROM email_sections WHERE email_template_id = new_template_id;
    FOR sec IN
      SELECT * FROM email_sections
      WHERE email_template_id = source_template_id
      ORDER BY order_index
    LOOP
      INSERT INTO email_sections (
        email_template_id, section_type, order_index,
        content, visible, background_color
      ) VALUES (
        new_template_id, sec.section_type, sec.order_index,
        sec.content, sec.visible, sec.background_color
      );
    END LOOP;
  END IF;
END $$;

NOTIFY pgrst, 'reload';
