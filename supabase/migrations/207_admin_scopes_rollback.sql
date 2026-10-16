-- Rollback for 207_admin_scopes.sql
-- Restores the 206 version of the trigger function, then drops the column.

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  protected_cols text[] := ARRAY[
    'is_admin', 'is_reviewer',
    'membership_level', 'previous_membership_level',
    'subscription_status', 'subscription_ends_at',
    'stripe_customer_id', 'stripe_subscription_id',
    'stripe_connect_account_id', 'stripe_onboarding_completed',
    'is_approved_free_member', 'free_membership_contact_submitted',
    'profile_completed', 'joined_at',
    'first_paid_at', 'first_paid_level', 'lifetime_value',
    'gift_code_redeemed',
    'waitlist_joined_at', 'waitlist_position',
    'waitlist_email_sent_at', 'waitlist_acceptance_sent_at',
    'incomplete_email_sent_at',
    'access_paused_at', 'access_paused_reason',
    'access_paused_by', 'access_paused_dispute_id'
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
$$;

COMMENT ON FUNCTION public.protect_profile_privileged_columns() IS
  'Blocks members (non-admin authenticated/anon sessions) from changing privileged profile columns. See migration 206.';

-- "zz_" prefix: Postgres fires BEFORE triggers alphabetically, so this runs
-- after the email/google sync triggers have set their values.
DROP TRIGGER IF EXISTS zz_protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER zz_protect_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();

ALTER TABLE public.profiles DROP COLUMN IF EXISTS admin_scopes;
