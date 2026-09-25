-- Migration 196: Late Submission Passes (grant_cycle_exceptions)
--
-- Lets an admin allow a specific member to apply to a CLOSED grant cycle
-- without reopening it publicly. A pass is:
--   - scoped to one (cycle_id, user_id)
--   - time-limited (expires_at, 12h default set by the admin API)
--   - single-use (used_at set by /api/grants/create on success)
--   - revocable (revoked_at)
-- Passes are unusable once first review is complete (scoring_completed_at),
-- enforced in lib/grant-eligibility.ts.
--
-- All member-side reads/writes go through service-role routes; RLS is
-- admin-only.

CREATE TABLE IF NOT EXISTS grant_cycle_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES grant_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 5),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_grant_id UUID REFERENCES grants(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one live (unused, unrevoked) pass per member per cycle.
CREATE UNIQUE INDEX IF NOT EXISTS idx_grant_cycle_exceptions_one_live
  ON grant_cycle_exceptions (cycle_id, user_id)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_grant_cycle_exceptions_user
  ON grant_cycle_exceptions (user_id)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_grant_cycle_exceptions_cycle
  ON grant_cycle_exceptions (cycle_id, created_at DESC);

ALTER TABLE grant_cycle_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage grant_cycle_exceptions" ON grant_cycle_exceptions;
CREATE POLICY "Admins manage grant_cycle_exceptions"
  ON grant_cycle_exceptions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload';
