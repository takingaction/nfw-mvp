-- ROLLBACK for migration 159_harden_rls_policies.sql
-- Restores the pre-159 (over-permissive) policies exactly as defined in
-- migrations 001, 096 and 130. Only run this if 159 causes a regression that
-- cannot be fixed forward.

BEGIN;

-- profiles
DROP POLICY IF EXISTS "Users can view own profile; admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

-- nfw_perks
DROP POLICY IF EXISTS "Admins can manage perks" ON public.nfw_perks;
CREATE POLICY "Admin full access to perks"
  ON public.nfw_perks FOR ALL USING (true);

-- nfw_perk_redemptions
DROP POLICY IF EXISTS "Admins can view all redemptions" ON public.nfw_perk_redemptions;
CREATE POLICY "Admin can view all redemptions"
  ON public.nfw_perk_redemptions FOR SELECT USING (true);

-- perks_settings
DROP POLICY IF EXISTS "perks_settings_admin_all" ON public.perks_settings;
CREATE POLICY "perks_settings_service_role_all"
  ON public.perks_settings FOR ALL USING (true);

-- Helper function is harmless to leave in place, but drop for a clean revert.
DROP FUNCTION IF EXISTS public.is_admin(uuid);

COMMIT;

NOTIFY pgrst, 'reload';
