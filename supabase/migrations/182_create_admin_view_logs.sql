-- Audit trail for admin "View as Member" sessions.
-- Inserted on session start. No DELETE policy — rows are immutable.

CREATE TABLE IF NOT EXISTS admin_view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  end_reason TEXT,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 5 AND 500),
  initial_page TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 7-year retention horizon. Computed by the BEFORE INSERT trigger below;
  -- Postgres refused GENERATED ALWAYS AS (started_at + INTERVAL '7 years')
  -- with 42P17 "generation expression is not immutable" so we set it in a
  -- trigger instead. search_path is pinned to pg_catalog, public as defense
  -- against search-path drift.
  retention_expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_view_logs_admin  ON admin_view_logs (admin_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_view_logs_target ON admin_view_logs (target_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_view_logs_active ON admin_view_logs (admin_user_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_view_logs_retention ON admin_view_logs (retention_expires_at);

ALTER TABLE admin_view_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read view logs"
  ON admin_view_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert their own view logs"
  ON admin_view_logs FOR INSERT
  WITH CHECK (
    admin_user_id = auth.uid()
    AND public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can update their own view logs"
  ON admin_view_logs FOR UPDATE
  USING (admin_user_id = auth.uid() AND public.is_admin(auth.uid()));

-- BEFORE INSERT trigger: compute retention_expires_at. search_path pinned
-- so the function works correctly if it's ever invoked from a context that
-- changes pg_catalog defaults.
CREATE OR REPLACE FUNCTION admin_view_logs_set_retention()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.retention_expires_at := NEW.started_at + INTERVAL '7 years';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_retention_expires ON admin_view_logs;
CREATE TRIGGER trg_set_retention_expires
  BEFORE INSERT ON admin_view_logs
  FOR EACH ROW EXECUTE FUNCTION admin_view_logs_set_retention();

NOTIFY pgrst, 'reload';
