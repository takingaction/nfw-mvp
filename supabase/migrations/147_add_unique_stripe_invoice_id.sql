-- Migration: Add UNIQUE constraint on stripe_invoice_id to prevent duplicate payments
-- This is a safety net - even if code has bugs, database prevents duplicate invoice IDs

-- Drop existing constraint if exists (might have different name)
ALTER TABLE membership_payments DROP CONSTRAINT IF EXISTS membership_payments_stripe_invoice_id_unique;

-- Add unique constraint on stripe_invoice_id
ALTER TABLE membership_payments ADD CONSTRAINT membership_payments_stripe_invoice_id_unique UNIQUE (stripe_invoice_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
