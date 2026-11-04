-- Migration 216: record when a free membership is approved.
--
-- Until now only the boolean profiles.is_approved_free_member existed, so the
-- Member Experience analytics had no start date for approved free members.
-- Approval happens in several places (contact-submission approve route,
-- waitlist accept route + page, admin member editor, bulk tools, raw SQL), so
-- the timestamp is set by a trigger rather than in each code path: any
-- transition of is_approved_free_member to TRUE stamps free_approved_at = now()
-- unless a value is already present. The first approval date is kept if the
-- flag is later toggled off and on again.
--
-- free_approved_at_source says how the value was obtained:
--   recorded            set by the trigger at approval time (exact)
--   waitlist_token      backfill: waitlist_acceptance_tokens.used_at (exact)
--   contact_submission  backfill: earliest "Free Membership Request" contact
--                       submission (lower bound: when they asked)
--   joined_at           backfill: profiles.joined_at for members who joined
--                       before the waitlist launched (before Jul 1 2026 PT).
--                       They were approved at signup (migration 104 era);
--                       most engaged within minutes of joining, so this is
--                       effectively exact.
--   joined_at_estimated backfill: profiles.joined_at for anyone else with no
--                       better record (e.g. waitlist approvals before tokens
--                       existed). An estimate; may be earlier than approval.
--
-- See MEMBER_EXPERIENCE_ANALYTICS.md.

-- Applying: run this file on its own, then 216b (backfill), then 217.
-- This file only changes the schema. The ALTER below needs a brief exclusive
-- lock on profiles; lock_timeout makes it fail fast (just re-run it) rather
-- than queue behind traffic and block the site. Adding nullable columns
-- with no default is metadata-only, so it does not rewrite the table.
SET lock_timeout = '5s';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS free_approved_at_source text;

-- NOT VALID: no table scan while holding the exclusive lock (the column is
-- empty anyway). Validated in 216b.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_free_approved_at_source_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_free_approved_at_source_check
  CHECK (free_approved_at_source IN ('recorded','waitlist_token','contact_submission','joined_at','joined_at_estimated'))
  NOT VALID;

RESET lock_timeout;

COMMENT ON COLUMN public.profiles.free_approved_at IS
  'When is_approved_free_member first became TRUE. Set by trigger trg_profiles_free_approved_at; historical rows backfilled (see free_approved_at_source).';

CREATE OR REPLACE FUNCTION public.set_free_approved_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.is_approved_free_member IS TRUE
     AND NEW.free_approved_at IS NULL
     AND (TG_OP = 'INSERT' OR OLD.is_approved_free_member IS DISTINCT FROM TRUE)
  THEN
    NEW.free_approved_at := now();
    NEW.free_approved_at_source := 'recorded';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_free_approved_at ON public.profiles;
CREATE TRIGGER trg_profiles_free_approved_at
  BEFORE INSERT OR UPDATE OF is_approved_free_member ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_free_approved_at();

-- Members must not be able to set these themselves: add them to the
-- privileged-column guard (same definition as live, plus the two new columns).
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
$function$;

NOTIFY pgrst, 'reload';
