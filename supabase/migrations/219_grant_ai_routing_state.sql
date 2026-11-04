-- Migration: 219_grant_ai_routing_state.sql
-- Bookkeeping for the AI score-and-route cron (app/api/cron/ai-score-and-route).
--
-- ai_score_attempts / ai_score_error: failed rubric-scoring attempts. After 3
--   failures the application is routed to Reviewer 1 (fail open: never held
--   without a score).
-- review_queue_reason: why the router chose grants.review_queue. Internal
--   only; never sent to the Reviewer 1 UI (a sampled app must look identical
--   to a routed one).
--   reviewer1: at_or_above_cutoff | already_reviewed | scoring_failed | ineligible
--   sampled:   random_sample
--   held:      below_cutoff

ALTER TABLE grants
  ADD COLUMN ai_score_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN ai_score_error TEXT,
  ADD COLUMN review_queue_reason TEXT
    CHECK (review_queue_reason IS NULL OR review_queue_reason IN (
      'at_or_above_cutoff', 'already_reviewed', 'scoring_failed',
      'random_sample', 'below_cutoff', 'ineligible'));

NOTIFY pgrst, 'reload';
