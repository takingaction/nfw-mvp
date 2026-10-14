-- Rollback for 202. NOTE: re-adding the table-wide UNIQUE constraint will FAIL
-- if any reversal rows now share a stripe_invoice_id with their original —
-- which is exactly what 202 exists to allow. Inspect first:
--   SELECT stripe_invoice_id, count(*) FROM membership_payments
--   WHERE stripe_invoice_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1;

DROP INDEX IF EXISTS membership_payments_original_invoice_unique;
DROP INDEX IF EXISTS idx_membership_payments_payment_intent;
DROP INDEX IF EXISTS idx_membership_payments_stripe_payment_id;
DROP INDEX IF EXISTS idx_membership_payments_original_payment_id;

ALTER TABLE membership_payments
  ADD CONSTRAINT membership_payments_stripe_invoice_id_unique UNIQUE (stripe_invoice_id);

NOTIFY pgrst, 'reload';
