-- Rollback for 205_member_access_pause.sql
DROP INDEX IF EXISTS public.idx_profiles_access_paused_dispute_id;
DROP INDEX IF EXISTS public.idx_profiles_access_paused_at;
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS access_paused_dispute_id,
  DROP COLUMN IF EXISTS access_paused_by,
  DROP COLUMN IF EXISTS access_paused_reason,
  DROP COLUMN IF EXISTS access_paused_at;
NOTIFY pgrst, 'reload';
