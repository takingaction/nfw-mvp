-- Migration: 077_add_rls_policies.sql
-- Purpose: Add RLS policies for dashboard_settings and email_sections tables
-- Date: 2026-06-07

-- Enable RLS is already done, just need to add policies

-- dashboard_settings table policies
-- Admins can read and write, public can read (for frontend display)
CREATE POLICY "Admins can manage dashboard_settings"
ON public.dashboard_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

CREATE POLICY "Anyone can read dashboard_settings"
ON public.dashboard_settings
FOR SELECT
TO public
USING (true);

-- email_sections table policies
-- Admins can manage, API routes use supabaseAdmin so they bypass RLS
-- For direct access: authenticated admins can do everything

CREATE POLICY "Admins can manage email_sections"
ON public.email_sections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

CREATE POLICY "Anyone can read email_sections"
ON public.email_sections
FOR SELECT
TO public
USING (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';