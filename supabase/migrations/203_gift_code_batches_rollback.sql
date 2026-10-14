-- Rollback for 203_gift_code_batches.sql
-- DESTRUCTIVE: deletes every batch-generated code (redeemed or not) and all batches.
-- Purchased (Stripe) codes and the profiles of people who redeemed batch codes are untouched.
-- RLS on gift_membership_codes is intentionally left enabled.

DROP VIEW IF EXISTS public.gift_code_batch_stats;
DROP FUNCTION IF EXISTS public.redeem_gift_code(TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.gift_code_status(TEXT);
DROP FUNCTION IF EXISTS public.create_gift_code_batch(TEXT, INTEGER, TEXT, INTEGER, TIMESTAMPTZ, TEXT, UUID);
DROP FUNCTION IF EXISTS public.gift_code_random();
DROP TABLE IF EXISTS public.gift_code_lookup_failures;

DELETE FROM public.gift_membership_codes WHERE batch_id IS NOT NULL;

ALTER TABLE public.gift_membership_codes
  DROP CONSTRAINT IF EXISTS chk_gift_codes_one_source,
  DROP CONSTRAINT IF EXISTS chk_gift_codes_not_redeemed_and_voided;
DROP INDEX IF EXISTS public.idx_gift_codes_batch_id;
ALTER TABLE public.gift_membership_codes
  DROP COLUMN IF EXISTS batch_id,
  DROP COLUMN IF EXISTS voided_at,
  DROP COLUMN IF EXISTS voided_reason,
  DROP COLUMN IF EXISTS voided_by;
ALTER TABLE public.gift_membership_codes
  ALTER COLUMN purchase_id SET NOT NULL;

DROP TABLE IF EXISTS public.gift_code_batches;

NOTIFY pgrst, 'reload';
