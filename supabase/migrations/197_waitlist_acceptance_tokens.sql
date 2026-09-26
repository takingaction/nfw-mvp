-- Migration: 197_waitlist_acceptance_tokens.sql
--
-- Two-step waitlist approval flow.
--
-- Old flow (immediate conversion):
--   admin clicks Approve → membership_level='free' immediately
--
-- New flow (token-based acceptance):
--   admin clicks Approve → create waitlist_acceptance_tokens row (30 days)
--   → send "Waitlist Approval" email with link to /auth/accept-waitlist?token=<uuid>
--   → member clicks link → token marked used_at → profile upgraded to free
--   → 7 days before expiry, cron sends reminder email
--   → if token unused at expiry, cron resets waitlist_joined_at to NOW()

CREATE TABLE waitlist_acceptance_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  expired_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one live (unused, unprocessed) token per user at a time.
-- Prevents admin double-click from creating multiple pending approvals.
CREATE UNIQUE INDEX idx_waitlist_tokens_one_live
  ON waitlist_acceptance_tokens (user_id)
  WHERE used_at IS NULL AND expired_processed_at IS NULL;

CREATE INDEX idx_waitlist_tokens_user
  ON waitlist_acceptance_tokens (user_id);

-- Cron finds tokens at day 23 (7 days before expiry) that haven't been reminded yet.
CREATE INDEX idx_waitlist_tokens_reminder
  ON waitlist_acceptance_tokens (created_at)
  WHERE used_at IS NULL
    AND expired_processed_at IS NULL
    AND reminder_sent_at IS NULL;

-- Cron finds tokens past expires_at that haven't been processed yet.
CREATE INDEX idx_waitlist_tokens_expired
  ON waitlist_acceptance_tokens (expires_at)
  WHERE used_at IS NULL
    AND expired_processed_at IS NULL;

ALTER TABLE waitlist_acceptance_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage waitlist_acceptance_tokens"
  ON waitlist_acceptance_tokens FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Tracks when an admin approval email was last sent. Distinguishes
-- "never approved" from "approved, waiting on member to click".
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS waitlist_acceptance_sent_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload';
