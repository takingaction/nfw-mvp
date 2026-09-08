-- Migration: 156_fix_membership_payments_payment_type.sql
-- Fix existing membership_payments records that have wrong payment_type
-- 
-- Problem: Old insert-missing used charges.list() which has no billing_reason.
-- All payments were inserted with payment_type = "signup" even if they were renewals.
--
-- Solution: Delete records with NULL stripe_invoice_id (the wrong ones).
-- Then run "Insert Missing" button to re-insert correctly using invoices.list().
--
-- Why delete? Because we can't reliably determine billing_reason for old charge-based records.
-- The invoices.list() approach gives us both invoice ID and billing_reason.

BEGIN;

-- Step 1: Backup the wrong records (in case we need to restore)
CREATE TABLE IF NOT EXISTS membership_payments_wrong_backup AS
SELECT * FROM membership_payments 
WHERE stripe_invoice_id IS NULL;

-- Step 2: Show how many will be deleted
-- SELECT COUNT(*) as wrong_records_count FROM membership_payments WHERE stripe_invoice_id IS NULL;

-- Step 3: Delete wrong records
DELETE FROM membership_payments 
WHERE stripe_invoice_id IS NULL;

-- Step 4: Show what we deleted
-- SELECT payment_type, COUNT(*) as count FROM membership_payments_wrong_backup GROUP BY payment_type;

COMMIT;

-- After running this migration:
-- 1. Go to /admin/backfill/stripe
-- 2. Click "Insert Missing" button
-- 3. This will re-insert the payments with CORRECT payment_type from invoices.list()
