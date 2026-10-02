-- Migration 200: Reviewer "Mark as Valid" for AI-flagged grant applications,
-- plus stop "Skip & Mark Invalid" from changing the member-visible status.
--
-- 1. ai_validated_at / ai_validated_by: a reviewer override that clears the AI
--    flag (badge, sort-to-bottom, "AI flagged" count) without overwriting the
--    AI's original verdict/reasoning. AI re-runs never touch these columns.
--
-- 2. Skipped grants (ai_invalidated_at set) previously had status flipped to
--    'not_approved' immediately, which members could see on /grants/my-applications
--    before the cycle was finalized. Skips now leave status = 'submitted';
--    Finalize Approvals still rejects every unchecked grant. This one-time
--    cleanup restores skipped grants in NON-finalized cycles only.

ALTER TABLE grants
  ADD COLUMN IF NOT EXISTS ai_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_validated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

UPDATE grants
SET status = 'submitted',
    reviewed_at = NULL
WHERE ai_invalidated_at IS NOT NULL
  AND status = 'not_approved'
  AND cycle_id IN (
    SELECT id FROM grant_cycles WHERE final_approved_at IS NULL
  );

NOTIFY pgrst, 'reload';
