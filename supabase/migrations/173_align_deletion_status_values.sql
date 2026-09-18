-- Migration: 173_align_deletion_status_values.sql
-- The CHECK constraint added in migration 158 allowed 'completed' but every
-- app-code site (admin UI tab/type/case, route handlers, cancel guard) uses
-- 'processed'. Real anonymizations were silently dropping on the UPDATE
-- because the constraint rejected 'processed'. Drop + recreate with the
-- app's vocabulary.
--
-- Diagnostic before running (ran on 2026-09-18 production):
--   SELECT status, COUNT(*) FROM deletion_requests GROUP BY status;
--   -- pending  | 1
--   -- verified | 1
--   -- (no 'completed' rows; user was stuck because process/route.ts tried
--   -- to write 'processed' and the CHECK allowed only 'completed')
--
-- The 14 anonymize steps themselves had completed successfully; only the
-- final status UPDATE was being rejected. The route's error branch returned
-- HTTP 200 with a `warning` field that the client never reads, surfacing
-- a green "Account anonymized successfully" banner even though the row
-- stayed at 'verified'. Pure silent failure.

BEGIN;

-- Defensive backfill: normalize any existing 'completed' rows to 'processed'
-- so the new constraint matches reality. No-op on current production data
-- (verified by the diagnostic above). Catches any future admin who somehow
-- gets a 'completed' row into the table.
UPDATE deletion_requests SET status = 'processed' WHERE status = 'completed';

ALTER TABLE deletion_requests
  DROP CONSTRAINT IF EXISTS deletion_requests_status_check;

ALTER TABLE deletion_requests
  ADD CONSTRAINT deletion_requests_status_check
  CHECK (status IN ('pending','verified','processing','processed','cancelled'));

COMMIT;

NOTIFY pgrst, 'reload';
