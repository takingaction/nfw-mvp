-- Rollback for migration 200.
-- Restores the old skip behavior (skipped grants in non-finalized cycles get
-- status = 'not_approved') and drops the validation columns.

UPDATE grants
SET status = 'not_approved'
WHERE ai_invalidated_at IS NOT NULL
  AND status = 'submitted'
  AND cycle_id IN (
    SELECT id FROM grant_cycles WHERE final_approved_at IS NULL
  );

ALTER TABLE grants
  DROP COLUMN IF EXISTS ai_validated_by,
  DROP COLUMN IF EXISTS ai_validated_at;

NOTIFY pgrst, 'reload';
