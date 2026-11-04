-- Migration: 218_grant_ai_rubric_scoring.sql
-- AI rubric scoring + routing for first-round microgrant review.
--
-- Goal: the AI scores every eligible application in a `scored` cycle against
-- the same rubric reviewers use. Only applications at/above the cycle's
-- cutoff (plus a blind random sample of those below it) reach Reviewer 1.
-- Reviewer 1 never sees the AI score.
--
-- Rubric mapping (human columns in grant_scores are historically misnamed):
--   intent_feasibility  ↔ grant_scores.urgency_score       (0–3, half points)
--   authenticity        ↔ grant_scores.authenticity_score  (0–3, half points)
--   impact              ↔ grant_scores.impact_score        (0–3, half points)
--   urgent              ↔ grant_scores.barriers_yn         (Y/N, not in total)
--   total = the three criteria (0–9), same as grant_scores.total_score
--
-- AI scores live in their own table, NOT grant_scores, so they can never mix
-- into reviewer totals, combined scores, or the Reviewer 1 UI.

-- ---------------------------------------------------------------------------
-- 1. AI scores (one row per grant per prompt version, so backtests of
--    different prompt versions can be compared side by side)
-- ---------------------------------------------------------------------------
CREATE TABLE grant_ai_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES grant_cycles(id) ON DELETE CASCADE,
  intent_feasibility NUMERIC(2,1) NOT NULL
    CHECK (intent_feasibility BETWEEN 0 AND 3 AND intent_feasibility * 2 = floor(intent_feasibility * 2)),
  authenticity NUMERIC(2,1) NOT NULL
    CHECK (authenticity BETWEEN 0 AND 3 AND authenticity * 2 = floor(authenticity * 2)),
  impact NUMERIC(2,1) NOT NULL
    CHECK (impact BETWEEN 0 AND 3 AND impact * 2 = floor(impact * 2)),
  urgent BOOLEAN NOT NULL,
  total NUMERIC(3,1) GENERATED ALWAYS AS (intent_feasibility + authenticity + impact) STORED,
  rationale JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  -- Cost tracking (token spend is one of the November holdups)
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  via_batch BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grant_ai_scores_grant_prompt_unique UNIQUE (grant_id, prompt_version)
);

CREATE INDEX idx_grant_ai_scores_cycle_total ON grant_ai_scores (cycle_id, total DESC);

ALTER TABLE grant_ai_scores ENABLE ROW LEVEL SECURITY;

-- Admin-only. NOTE: reviewers are admins too, so RLS alone does not hide the
-- score from Reviewer 1 — the Reviewer 1 routes/pages must simply never
-- select from this table. Workers use the service role (bypasses RLS).
CREATE POLICY "Admins manage grant_ai_scores"
  ON grant_ai_scores FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. Per-cycle configuration
-- ---------------------------------------------------------------------------
ALTER TABLE grant_cycles
  -- Master switch. Off by default: existing and random-draw cycles are untouched.
  ADD COLUMN ai_scoring_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Absolute AI total (0–9) at/above which an application goes to Reviewer 1.
  -- NULL = score but don't route (shadow mode).
  ADD COLUMN ai_score_cutoff NUMERIC(3,1)
    CHECK (ai_score_cutoff IS NULL OR ai_score_cutoff BETWEEN 0 AND 9),
  -- Share of below-cutoff applications sent blind to Reviewer 1 to measure
  -- false negatives.
  ADD COLUMN ai_sample_rate NUMERIC(4,3) NOT NULL DEFAULT 0.05
    CHECK (ai_sample_rate BETWEEN 0 AND 1),
  -- Max applications advanced to Reviewer 2 (top N by Reviewer 1 score).
  ADD COLUMN reviewer2_cap INTEGER CHECK (reviewer2_cap IS NULL OR reviewer2_cap > 0),
  -- Of reviewer2_cap, slots reserved for Reviewer 1 "Needs Discussion".
  ADD COLUMN reviewer2_discussion_slots INTEGER NOT NULL DEFAULT 10
    CHECK (reviewer2_discussion_slots >= 0),
  -- Internal clarifications for the AI (relevance check AND rubric scoring):
  -- what counts as on-theme, edge cases, what scores zero. Never shown to
  -- applicants.
  ADD COLUMN reviewer_guidance TEXT;

-- ---------------------------------------------------------------------------
-- 3. Routing state on each application
-- ---------------------------------------------------------------------------
ALTER TABLE grants
  -- reviewer1: at/above cutoff
  -- sampled:   below cutoff, randomly chosen for Reviewer 1 (looks identical
  --            to reviewer1 in the Reviewer 1 UI)
  -- held:      below cutoff; not reviewed; rejected only at cycle finalize
  -- NULL:      not routed (AI scoring off for the cycle, ineligible, or not
  --            yet scored)
  ADD COLUMN review_queue TEXT
    CHECK (review_queue IS NULL OR review_queue IN ('reviewer1', 'sampled', 'held')),
  ADD COLUMN routed_at TIMESTAMPTZ;

CREATE INDEX idx_grants_cycle_review_queue ON grants (cycle_id, review_queue)
  WHERE review_queue IS NOT NULL;

NOTIFY pgrst, 'reload';
