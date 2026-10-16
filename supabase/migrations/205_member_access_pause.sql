-- Migration 205: Admin "pause" of a member's access
--
-- A paused member keeps their tier, subscription and Stripe state untouched,
-- but is locked out of everything past the dashboard (perks, store claims,
-- travel, new grant applications) — the same locks used for incomplete /
-- abandoned / waitlist members. See lib/member-access.ts.
--
-- access_paused_at IS NOT NULL  <=>  member is paused.
-- access_paused_dispute_id: optional Stripe dispute ID (dp_...). When that
--   dispute closes as "won", the Stripe webhook unpauses the member
--   automatically. A pause without a dispute ID is only lifted by an admin.
--
-- Writes go through POST /api/admin/members/[id]/access-pause (service role).
-- Migration 206 stops members from changing these columns themselves.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_paused_reason text,
  ADD COLUMN IF NOT EXISTS access_paused_by uuid,
  ADD COLUMN IF NOT EXISTS access_paused_dispute_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_access_paused_at
  ON public.profiles (access_paused_at)
  WHERE access_paused_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_access_paused_dispute_id
  ON public.profiles (access_paused_dispute_id)
  WHERE access_paused_dispute_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.access_paused_at IS
  'Set when an admin pauses this member''s access (e.g. Stripe dispute). NULL = not paused.';
COMMENT ON COLUMN public.profiles.access_paused_reason IS 'Admin-entered reason for the pause.';
COMMENT ON COLUMN public.profiles.access_paused_by IS 'Admin user id who paused the member.';
COMMENT ON COLUMN public.profiles.access_paused_dispute_id IS
  'Optional Stripe dispute id (dp_...). A won dispute with this id auto-unpauses the member.';

NOTIFY pgrst, 'reload';
