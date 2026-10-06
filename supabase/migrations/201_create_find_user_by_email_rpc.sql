-- Migration: 201_create_find_user_by_email_rpc.sql
-- Add a Postgres RPC for email → auth user id lookups.
--
-- Webhook handlers were calling supabase.auth.admin.listUsers() to find an
-- auth user by email, but listUsers() defaults to 50 users per page and
-- has no filter-by-email param. Past ~50 users the lookup silently returns
-- undefined and webhook reconciliation never runs (subscription state changes,
-- profile updates from checkout, etc.).
--
-- Mirrors the public.is_admin() pattern from migration 159: SECURITY DEFINER
-- with restricted search_path so the function can read auth.users from
-- service-role context. Restricted to service_role only.
--
-- Returns both id and email so callers can verify the lookup matched
-- (reusable across the codebase for any future email-based auth lookup).

CREATE OR REPLACE FUNCTION public.find_user_by_email(target_email text)
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT id, email FROM auth.users WHERE email = target_email LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_user_by_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO service_role;

COMMENT ON FUNCTION public.find_user_by_email(text) IS
  'Lookup an auth user id by exact email match. SEC DEFINER so we can read auth.users from service-role context. Service role only. Replaces supabase.auth.admin.listUsers() + filter for any future email-based lookup needs.';