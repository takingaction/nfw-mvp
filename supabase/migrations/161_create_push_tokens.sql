-- Migration 161: Expo push notification tokens for the mobile app
--
-- One row per device token. A member may have several devices. Tokens are
-- registered by POST /api/push/register (mobile) and consumed by lib/push.ts
-- when grant status changes. Expo reports DeviceNotRegistered for stale tokens,
-- which lib/push.ts deletes.

BEGIN;

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,                       -- "ExponentPushToken[...]"
  platform      TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name   TEXT,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,              -- member-level opt-out toggle
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_enabled ON public.push_tokens(user_id) WHERE enabled = TRUE;

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Members manage only their own device tokens. Sending uses the service role.
CREATE POLICY "Users can view own push tokens"
  ON public.push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can register own push tokens"
  ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON public.push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON public.push_tokens FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.push_tokens IS 'Expo push tokens registered by the NFW mobile app (one row per device).';

COMMIT;

NOTIFY pgrst, 'reload';
