-- Migration 209: Random-draw grant cycles + per-criterion AI review
--
-- 1. grant_cycles.selection_method
--      'scored' (default): the existing two-reviewer scoring flow.
--      'random': Reviewer 1 screens applications, then draws N winners
--      (N = grants_available) at random from the eligible pool. Reviewer 2
--      confirms or rejects each winner and draws replacements for rejected ones.
--
-- 2. grants.ai_criteria: the AI's per-criterion verdicts
--      { completeness: {verdict, note}, permitted_use: {verdict, note} }
--    grants.eligibility_checks: deterministic checks run in code
--      { membership: {verdict, note}, grant_restrictions: {verdict, note}, checked_at }
--    ai_relevance stays the overall verdict: 'irrelevant' if any criterion
--    fails, 'uncertain' if any is uncertain, else 'relevant'.
--
-- 3. grant_draws: one row per drawn winner, with an audit trail of who drew it,
--    from how large a pool, and who confirmed or rejected it.
--      drawn     → selected, awaiting a decision
--      confirmed → reviewer verified eligibility
--      rejected  → reviewer found the winner ineligible (they get the normal
--                  rejection email at finalize; a replacement can be drawn)
--      voided    → discarded by a full redraw before hand-off to Reviewer 2
--    A grant can hold at most one non-voided draw, so nobody is drawn twice.
--    Reads and writes go through service-role API routes; RLS is admin-only.

ALTER TABLE grant_cycles
  ADD COLUMN IF NOT EXISTS selection_method TEXT NOT NULL DEFAULT 'scored';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grant_cycles_selection_method_check'
  ) THEN
    ALTER TABLE grant_cycles
      ADD CONSTRAINT grant_cycles_selection_method_check
      CHECK (selection_method IN ('scored', 'random'));
  END IF;
END $$;

ALTER TABLE grants
  ADD COLUMN IF NOT EXISTS ai_criteria JSONB,
  ADD COLUMN IF NOT EXISTS eligibility_checks JSONB;

CREATE TABLE IF NOT EXISTS grant_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES grant_cycles(id) ON DELETE CASCADE,
  grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round >= 1),
  pool_size INTEGER NOT NULL CHECK (pool_size >= 0),
  status TEXT NOT NULL DEFAULT 'drawn'
    CHECK (status IN ('drawn', 'confirmed', 'rejected', 'voided')),
  drawn_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  drawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_grant_draws_one_active_per_grant
  ON grant_draws (grant_id)
  WHERE status <> 'voided';

CREATE INDEX IF NOT EXISTS idx_grant_draws_cycle
  ON grant_draws (cycle_id, status);

ALTER TABLE grant_draws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage grant_draws" ON grant_draws;
CREATE POLICY "Admins manage grant_draws"
  ON grant_draws FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload';
