-- Add a discriminator column so analytics queries can exclude Stripe
-- adjustment invoices ($0 paid invoices with billing_reason =
-- 'subscription_cycle') without having to inspect (amount, payment_type)
-- tuples inline.
--
-- See AGENTS.md entry for 2026-09-30 ("Verified Revenue (Period) ≠ Stripe
-- Dashboard") — ~7 historical rows that fit this description were
-- recorded as `payment_type = 'renewal' AND amount = 0 AND succeeded`.
-- They don't reflect actual revenue and should be hidden from analytics
-- sums (already done in AdminAnalyticsClient via `p.amount > 0`) and
-- tagged here so a Stripe-side audit can identify them.

ALTER TABLE membership_payments
  ADD COLUMN IF NOT EXISTS kind TEXT
    CHECK (kind IN ('real', 'info_only', 'void_invoice'));

-- Backfill existing rows. Default everything we don't recognize as
-- void to 'real' so a partial index (future ticket) can isolate them.
UPDATE membership_payments
SET kind = 'void_invoice'
WHERE payment_type = 'renewal'
  AND amount = 0
  AND status = 'succeeded';

UPDATE membership_payments
SET kind = 'real'
WHERE kind IS NULL;

-- Index for the analytics read path that will eventually use this.
-- Partial index keeps it small since most rows are 'real'.
CREATE INDEX IF NOT EXISTS idx_membership_payments_kind
  ON membership_payments(kind)
  WHERE kind <> 'real';

NOTIFY pgrst, 'reload';
