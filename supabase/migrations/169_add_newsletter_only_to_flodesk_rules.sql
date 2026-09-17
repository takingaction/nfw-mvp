-- Migration: 169_add_newsletter_only_to_flodesk_rules.sql
-- Adds 'Newsletter Only' as a 7th valid category in flodesk_sync_rules and creates
-- flodesk_sync_newsletter for idempotent state (rule_id, email).
--
-- Newsletter Only eligibility: emails in coming_soon_emails that have NO matching
-- profiles.email (any membership tier / status). When that email later becomes a
-- profile, the next hourly cron removes them from the Flodesk segment.
--
-- Rollback:
--   DROP TABLE IF EXISTS flodesk_sync_newsletter;
--   ALTER TABLE flodesk_sync_rules DROP CONSTRAINT IF EXISTS flodesk_sync_rules_category_check;
--   ALTER TABLE flodesk_sync_rules ADD CONSTRAINT flodesk_sync_rules_category_check
--     CHECK (category IN ('Waitlist','Abandoned','Profile Incomplete','Free','Contributing','Founding'));

-- ---------------------------------------------------------------------------
-- 1. Expand the category CHECK constraint
-- ---------------------------------------------------------------------------
ALTER TABLE flodesk_sync_rules DROP CONSTRAINT IF EXISTS flodesk_sync_rules_category_check;
ALTER TABLE flodesk_sync_rules ADD CONSTRAINT flodesk_sync_rules_category_check
  CHECK (category IN (
    'Waitlist', 'Abandoned', 'Profile Incomplete', 'Free', 'Contributing', 'Founding',
    'Newsletter Only'
  ));

-- ---------------------------------------------------------------------------
-- 2. Per-rule, per-email sync state (idempotency + exit detection)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flodesk_sync_newsletter (
  rule_id UUID NOT NULL REFERENCES flodesk_sync_rules(id) ON DELETE CASCADE,
  email TEXT NOT NULL,

  status TEXT NOT NULL CHECK (status IN ('added', 'removed', 'failed')),

  -- Stored so we can remove the subscriber by id even after the row is anonymized
  flodesk_subscriber_id TEXT,

  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  added_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (rule_id, email)
);

CREATE INDEX IF NOT EXISTS idx_flodesk_sync_newsletter_rule_status
  ON flodesk_sync_newsletter(rule_id, status);

-- ---------------------------------------------------------------------------
-- 3. RLS: admin-only. All server code uses the service role (bypasses RLS).
-- ---------------------------------------------------------------------------
ALTER TABLE flodesk_sync_newsletter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage flodesk_sync_newsletter"
  ON flodesk_sync_newsletter FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload';
