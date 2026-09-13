-- Migration: 162_add_ai_evaluation_to_grants.sql
-- Adds AI evaluation columns to grants for relevance filtering

ALTER TABLE grants
  ADD COLUMN IF NOT EXISTS ai_relevance TEXT
    CHECK (ai_relevance IN ('relevant', 'irrelevant', 'uncertain', 'not_evaluated'))
    DEFAULT 'not_evaluated',
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS ai_evaluated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_model_version TEXT,
  ADD COLUMN IF NOT EXISTS ai_invalidated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_invalidated_by UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_grants_ai_pending
  ON grants(cycle_id, ai_relevance)
  WHERE ai_relevance IN ('irrelevant', 'uncertain') AND ai_invalidated_at IS NULL;

NOTIFY pgrst, 'reload';
