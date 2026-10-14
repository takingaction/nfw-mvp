-- Migration 202: make stripe_invoice_id uniqueness apply to ORIGINAL payments only
--
-- Problem: migration 147 added UNIQUE (stripe_invoice_id) on membership_payments.
-- recordPaymentReversal() (lib/membership-tier.ts) inserts the refund/dispute
-- reversal row with the ORIGINAL payment's stripe_invoice_id, so any refund on
-- an invoice-backed payment (every subscription signup/renewal) hits a unique
-- violation and the reversal is silently not recorded.
--
-- Fix: replace the table-wide constraint with a partial unique index that only
-- covers original rows (original_payment_id IS NULL). Dedupe of ingested
-- invoices is unchanged; reversal rows can now share the invoice ID.
--
-- Safe to re-run. No app code uses ON CONFLICT (stripe_invoice_id), which would
-- not work against a partial index.

ALTER TABLE membership_payments
  DROP CONSTRAINT IF EXISTS membership_payments_stripe_invoice_id_unique;

DROP INDEX IF EXISTS membership_payments_stripe_invoice_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS membership_payments_original_invoice_unique
  ON membership_payments (stripe_invoice_id)
  WHERE original_payment_id IS NULL AND stripe_invoice_id IS NOT NULL;

-- Refund/dispute matching now looks up by PaymentIntent and charge ID.
CREATE INDEX IF NOT EXISTS idx_membership_payments_payment_intent
  ON membership_payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_membership_payments_stripe_payment_id
  ON membership_payments (stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_membership_payments_original_payment_id
  ON membership_payments (original_payment_id)
  WHERE original_payment_id IS NOT NULL;

NOTIFY pgrst, 'reload';
