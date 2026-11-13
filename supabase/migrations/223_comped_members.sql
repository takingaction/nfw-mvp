-- Migration: 223_comped_members.sql
--
-- Complimentary memberships: paid-level members with no Stripe subscription
-- by design (board, staff, early supporters). Set from the Stripe Sync page
-- (/admin/backfill/stripe) with "Mark comped". A label only: it doesn't
-- change level or access. Comped members show as expected on that page
-- instead of "Paid in DB, nothing in Stripe".
--
-- Both columns are added to protect_profile_privileged_columns() so members
-- can't set them on their own profile. The function is otherwise unchanged.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS comped_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS comped_note text;

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  protected_cols text[] := ARRAY[
    'is_admin', 'is_reviewer', 'admin_scopes',
    'membership_level', 'previous_membership_level',
    'subscription_status', 'subscription_ends_at',
    'stripe_customer_id', 'stripe_subscription_id',
    'stripe_connect_account_id', 'stripe_onboarding_completed',
    'is_approved_free_member', 'free_membership_contact_submitted',
    'free_approved_at', 'free_approved_at_source',
    'profile_completed', 'joined_at',
    'first_paid_at', 'first_paid_level', 'lifetime_value',
    'gift_code_redeemed',
    'waitlist_joined_at', 'waitlist_position',
    'waitlist_email_sent_at', 'waitlist_acceptance_sent_at',
    'incomplete_email_sent_at',
    'access_paused_at', 'access_paused_reason',
    'access_paused_by', 'access_paused_dispute_id',
    'comped_at', 'comped_note'
  ];
  old_row jsonb;
  new_row jsonb;
  col text;
BEGIN
  -- Only member sessions are restricted. service_role / postgres pass through.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  old_row := to_jsonb(OLD);
  new_row := to_jsonb(NEW);

  FOREACH col IN ARRAY protected_cols LOOP
    IF new_row ? col AND (new_row -> col) IS DISTINCT FROM (old_row -> col) THEN
      RAISE EXCEPTION 'Not allowed to change profiles.%', col
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;
