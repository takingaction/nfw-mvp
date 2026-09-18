-- Migration: 173_align_deletion_status_values_rollback.sql
-- Rollback for migration 173. Restores the original constraint (allowing
-- 'completed' instead of 'processed') and reverses the data migration.

BEGIN;

UPDATE deletion_requests SET status = 'completed' WHERE status = 'processed';

ALTER TABLE deletion_requests
  DROP CONSTRAINT IF EXISTS deletion_requests_status_check;

ALTER TABLE deletion_requests
  ADD CONSTRAINT deletion_requests_status_check
  CHECK (status IN ('pending','verified','processing','completed','cancelled'));

COMMIT;

NOTIFY pgrst, 'reload';
