-- Migration: 221_admin_auth_lookup_and_stuck_signups.sql
--
-- Support could not see members whose signup stalled between "email confirmed"
-- and "profile created": the admin members list reads profiles, and for email
-- signups the profile row is only created when step 1 of the signup form is
-- submitted. A mail scanner opening the confirmation link (fixed in
-- app/auth/confirm/route.ts) left hundreds of people confirmed, signed out and
-- invisible to admin.
--
-- 1. Security fix: migration 201 meant find_user_by_email to be service-role
--    only, but REVOKE ... FROM public does not remove Supabase's default
--    EXECUTE grants to anon and authenticated, so anyone with the publishable
--    key could map an email to an auth user id. Only the Stripe webhook calls
--    it, with the service role. Same cleanup for send_abandoned_checkout_emails
--    (cron-only; not SECURITY DEFINER, so anon calls already failed, but it
--    has no business being callable).
-- 2. admin_lookup_auth_user(email): auth state + profile summary for one email,
--    for /api/admin/members/lookup. Service role only.
-- 3. admin_list_stuck_signups(): confirmed auth users with no profile, with
--    the last finish-signup reminder sent (email_sends, matched by recipient,
--    because email_sends.user_id references profiles). Service role only.

-- 1. Lock down existing functions -------------------------------------------
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.send_abandoned_checkout_emails() FROM public, anon, authenticated;

-- 2. One-account lookup ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_lookup_auth_user(target_email text)
RETURNS TABLE(
  id uuid,
  email text,
  created_at timestamptz,
  confirmation_sent_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  recovery_sent_at timestamptz,
  banned_until timestamptz,
  providers text[],
  has_password boolean,
  has_profile boolean,
  profile_completed boolean,
  membership_level text,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    u.id,
    u.email::text,
    u.created_at,
    u.confirmation_sent_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.recovery_sent_at,
    u.banned_until,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(u.raw_app_meta_data -> 'providers')), ARRAY[]::text[]),
    COALESCE(u.encrypted_password, '') <> '',
    p.id IS NOT NULL,
    p.profile_completed,
    p.membership_level::text,
    p.full_name::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(btrim(target_email))
    AND u.deleted_at IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.admin_lookup_auth_user(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lookup_auth_user(text) TO service_role;

COMMENT ON FUNCTION public.admin_lookup_auth_user(text) IS
  'Admin support lookup: auth state and profile summary for one email (case-insensitive). Service role only.';

-- 3. Stuck signups -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_stuck_signups(reminder_slug text DEFAULT 'incomplete-member-reengagement')
RETURNS TABLE(
  id uuid,
  email text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  providers text[],
  last_reminder_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    u.id,
    u.email::text,
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(u.raw_app_meta_data -> 'providers')), ARRAY[]::text[]),
    (SELECT max(s.created_at) FROM public.email_sends s
      WHERE s.template_slug = reminder_slug
        AND lower(s.recipient) = lower(u.email)
        AND s.status <> 'failed')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
    AND u.email_confirmed_at IS NOT NULL
    AND u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until < now())
    AND u.email IS NOT NULL
  ORDER BY u.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_list_stuck_signups(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_stuck_signups(text) TO service_role;

COMMENT ON FUNCTION public.admin_list_stuck_signups(text) IS
  'Confirmed auth users with no profile row (signup stalled before step 1), with the last reminder sent. Service role only.';
