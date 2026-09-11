-- Migration 159: Harden over-permissive RLS policies
--
-- Background (audit 2026-09-11, see AGENTS.md "Session 2026-09-11: RLS Hardening"):
--   * profiles                SELECT USING (true)      -> every profile (email, DOB, income,
--                                                         Stripe IDs) readable by ANY client
--   * nfw_perks               FOR ALL USING (true)     -> anyone can read/write/delete perks
--   * nfw_perk_redemptions    SELECT USING (true)      -> anyone can read all members' redemptions
--   * perks_settings          FOR ALL USING (true)     -> anyone can write settings
--
-- This matters more now that the publishable key ships inside the mobile app binary.
--
-- PREREQUISITE: deploy the accompanying web code changes FIRST. They move the handful of
-- legitimate cross-user reads (article author names, NFW-perk global redemption count,
-- admin perk CRUD, set-reviewer) onto the service-role client, which bypasses RLS.
--
-- Rollback: 159_harden_rls_policies_rollback.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Helper: is_admin(uid)
--    SECURITY DEFINER is REQUIRED. A plain function that reads `profiles` from
--    inside a `profiles` policy would re-enter RLS and recurse.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.is_admin(uuid) IS
  'True if the given auth user id has profiles.is_admin = true. SECURITY DEFINER so it can be used inside profiles RLS policies without recursion.';

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile; admins can view all"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Existing: "Users can update own profile" USING (auth.uid() = id) — kept.
-- New: admins may update other members' rows (reviewer toggle, etc.).
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. nfw_perks
--    Keep: "Public read access to active perks" SELECT USING (is_active = true)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access to perks" ON public.nfw_perks;

CREATE POLICY "Admins can manage perks"
  ON public.nfw_perks
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. nfw_perk_redemptions
--    Keep: "Users can view their own redemptions" SELECT USING (auth.uid() = user_id)
--    Keep: "Users can create their own redemptions" INSERT WITH CHECK (auth.uid() = user_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can view all redemptions" ON public.nfw_perk_redemptions;

CREATE POLICY "Admins can view all redemptions"
  ON public.nfw_perk_redemptions
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. perks_settings
--    Keep: "perks_settings_public_read" SELECT USING (true)
--    (service_role bypasses RLS entirely; the dropped policy only granted
--     write access to everyone else.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "perks_settings_service_role_all" ON public.perks_settings;

CREATE POLICY "perks_settings_admin_all"
  ON public.perks_settings
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

COMMIT;

NOTIFY pgrst, 'reload';

-- ---------------------------------------------------------------------------
-- Post-migration verification (run manually):
--
--   SELECT tablename, policyname, cmd, qual
--   FROM pg_policies
--   WHERE tablename IN ('profiles','nfw_perks','nfw_perk_redemptions','perks_settings')
--   ORDER BY tablename, policyname;
--
-- Expected: no remaining policy on these tables with qual = 'true' except
--   profiles/perks_settings public SELECTs noted above and
--   nfw_perks "Public read access to active perks" (qual = is_active = true).
-- ---------------------------------------------------------------------------
