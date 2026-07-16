-- Remove 'in_review' from grants status CHECK constraint
ALTER TABLE grants DROP CONSTRAINT IF EXISTS grants_status_check;
ALTER TABLE grants ADD CONSTRAINT grants_status_check
  CHECK (status IN ('submitted', 'approved', 'not_approved', 'payment_pending', 'payment_sent'));
NOTIFY pgrst, 'reload';
