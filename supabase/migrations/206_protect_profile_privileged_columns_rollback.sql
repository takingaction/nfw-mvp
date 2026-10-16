-- Rollback for 206_protect_profile_privileged_columns.sql
DROP TRIGGER IF EXISTS zz_protect_profile_privileged_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_privileged_columns();
