-- Migration: Add stripe_payment_intent_id column for linking charges to payment intents
-- This enables proper refund handling by storing both charge ID and payment intent ID

-- Add stripe_payment_intent_id column to store the payment intent ID (not charge ID)
-- When a refund comes in, we get the charge ID, but we stored the payment intent ID
-- This column allows us to look up by payment intent ID when charge ID lookup fails
ALTER TABLE membership_payments ADD COLUMN stripe_payment_intent_id TEXT;

-- Create index for efficient lookups by payment intent ID
CREATE INDEX IF NOT EXISTS idx_membership_payments_payment_intent
  ON membership_payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
