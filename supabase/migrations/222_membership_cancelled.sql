-- Migration: 222_membership_cancelled.sql
--
-- A paid membership that ends (Stripe subscription deleted at the end of the
-- paid period, or a gift membership past its end date) now moves the member
-- to membership_level = 'cancelled': dashboard only, like waitlist members
-- (lib/member-access.ts hasTierAccess() only grants paid and approved-free).
-- previous_membership_level keeps the tier they had.
--
-- Also records Stripe's failed-renewal states on subscription_status
-- ('past_due', 'unpaid') instead of overwriting them with 'active'. Members
-- keep access while Stripe retries.
--
-- Run BEFORE deploying the matching code: the webhook writes these values.
-- Both changes only widen the allowed values, so existing rows are unaffected.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_membership_level_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_membership_level_check
  CHECK (membership_level = ANY (ARRAY['free'::text, 'contributing'::text, 'founding'::text, 'waitlist'::text, 'cancelled'::text]));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IS NULL OR subscription_status = ANY (ARRAY['active'::text, 'canceling'::text, 'cancelled'::text, 'failed'::text, 'past_due'::text, 'unpaid'::text]));
