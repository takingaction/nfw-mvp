-- Migration: 178_grant_ai_eval_queue.sql
-- Decouples grant AI evaluation from the submission request worker so
-- Vercel can't kill the response stream mid-flight.
--
-- Background: on 2026-09-20T02:34:01Z a user (saoirsefinn13@icloud.com)
-- saw "The string did not match the expected pattern" — a browser-level
-- JSON.parse failure because the Vercel worker was aborted while the
-- inline Anthropic call was still in flight. The grant row was inserted
-- correctly, but the response stream was cut off, and the form's
-- hardened JSON.parse had not been written yet.
--
-- This queue receives one row per submission. The route's caller writes
-- it (fire-and-forget after the user-facing response) and a 2-min cron
-- picks it up. Existing inline-eval behavior stays as a fallback for
-- any rows that arrived before this migration was applied (the existing
-- `process-ai-evaluate-pending` cron continues to scan for them).

CREATE TABLE grant_ai_eval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES grant_cycles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- One queue row per grant. Re-submissions re-use the existing row.
  CONSTRAINT grant_ai_eval_queue_grant_id_unique UNIQUE (grant_id)
);

-- Partial index for the cron: only pending rows need a quick lookup.
CREATE INDEX idx_grant_ai_eval_queue_pending
  ON grant_ai_eval_queue (queued_at)
  WHERE status = 'pending';

ALTER TABLE grant_ai_eval_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only via the standard public.is_admin() helper (added in
-- migration 159). The cron worker uses supabaseAdmin which bypasses
-- RLS, matching the pattern of every other job-table in this codebase.
CREATE POLICY "Admins manage grant_ai_eval_queue"
  ON grant_ai_eval_queue FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload';
