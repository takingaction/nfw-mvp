-- Migration: 208_email_sends.sql
--
-- Delivery tracking for transactional email sent via Resend.
--
--   sendEmailBySlug() (lib/email.ts) inserts one row per send attempt:
--     - status 'sent'   when Resend's API accepted the email (resend_email_id set)
--     - status 'failed' when we never handed it to Resend or the API rejected it
--                       (error_message holds the reason, resend_email_id is NULL)
--   /api/webhooks/resend then updates the row by resend_email_id as Resend
--   reports delivered / delivery_delayed / bounced / complained / failed /
--   suppressed.
--
-- waitlist_acceptance_tokens.email_send_id links each approval link to the
-- email that carried it, so /admin/waitlist can show delivery status.

CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id TEXT UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  template_slug TEXT,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'sent', 'delivered', 'delivery_delayed', 'bounced',
    'complained', 'failed', 'suppressed'
  )),
  bounce_type TEXT,          -- Resend bounce.type, e.g. 'Permanent' | 'Transient' | 'Undetermined'
  bounce_subtype TEXT,       -- Resend bounce.subType / suppressed.type
  error_message TEXT,        -- bounce.message, failed.reason, suppressed.message, or our send error
  last_event_at TIMESTAMPTZ, -- created_at of the latest applied webhook event (ordering guard)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_user ON email_sends (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends (status);

ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- Writes come from the service-role client only (bypasses RLS).
CREATE POLICY "Admins read email_sends"
  ON email_sends FOR SELECT
  USING (public.is_admin(auth.uid()));

ALTER TABLE waitlist_acceptance_tokens
  ADD COLUMN IF NOT EXISTS email_send_id UUID REFERENCES email_sends(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload';
