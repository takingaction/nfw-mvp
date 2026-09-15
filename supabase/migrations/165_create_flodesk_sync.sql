-- Migration: 165_create_flodesk_sync.sql
-- Flodesk category sync: rules map a member category (from lib/member-categories.ts getCategory())
-- to a Flodesk segment. An hourly cron adds members who have been in the category for
-- `delay_days` and removes them when they leave the category.
--
-- Rollback:
--   DROP TABLE IF EXISTS flodesk_sync_members;
--   DROP TABLE IF EXISTS flodesk_sync_rules;

-- ---------------------------------------------------------------------------
-- Rules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flodesk_sync_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Must match a value returned by getCategory() in lib/member-categories.ts
  category TEXT NOT NULL CHECK (category IN (
    'Waitlist', 'Abandoned', 'Profile Incomplete', 'Free', 'Contributing', 'Founding'
  )),

  -- Days a member must have been in the category before being added
  delay_days INTEGER NOT NULL DEFAULT 0 CHECK (delay_days >= 0),

  flodesk_segment_id TEXT,
  flodesk_segment_name TEXT,

  remove_on_exit BOOLEAN NOT NULL DEFAULT TRUE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A rule cannot be enabled without a target segment
  CONSTRAINT flodesk_sync_rules_enabled_requires_segment
    CHECK (is_enabled = FALSE OR flodesk_segment_id IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- Per-member, per-rule sync state (idempotency + exit detection)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flodesk_sync_members (
  rule_id UUID NOT NULL REFERENCES flodesk_sync_rules(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  status TEXT NOT NULL CHECK (status IN ('added', 'removed', 'failed')),

  -- Stored so we can remove the subscriber by id even after their email is anonymized
  flodesk_subscriber_id TEXT,

  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  added_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (rule_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_flodesk_sync_members_rule_status
  ON flodesk_sync_members(rule_id, status);

CREATE INDEX IF NOT EXISTS idx_flodesk_sync_members_profile
  ON flodesk_sync_members(profile_id);

-- ---------------------------------------------------------------------------
-- Seed rules (disabled until an admin assigns a segment in /admin/flodesk)
-- ---------------------------------------------------------------------------
INSERT INTO flodesk_sync_rules (key, name, description, category, delay_days)
VALUES
  ('waitlist', 'Waitlist',
   'Members on the free-membership waitlist for 5+ days.',
   'Waitlist', 5),
  ('abandoned', 'Abandoned',
   'Members who completed their profile but never chose a membership tier (abandoned at step 3).',
   'Abandoned', 1),
  ('profile_incomplete', 'Profile Incomplete',
   'Members who confirmed their email but never finished the profile steps.',
   'Profile Incomplete', 1)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS: admin-only. All server code uses the service role (bypasses RLS).
-- ---------------------------------------------------------------------------
ALTER TABLE flodesk_sync_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE flodesk_sync_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage flodesk_sync_rules"
  ON flodesk_sync_rules FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage flodesk_sync_members"
  ON flodesk_sync_members FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload';
