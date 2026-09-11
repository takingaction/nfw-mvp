-- Migration: 158_create_deletion_system.sql
-- GDPR-compliant member deletion/anonymization system

-- ============================================================
-- TABLE: deletion_requests
-- Stores member deletion requests
-- ============================================================
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- User requested, awaiting admin processing
    'verified',     -- Admin verified identity
    'processing',   -- Anonymization in progress
    'completed',    -- Anonymization finished
    'cancelled'    -- Request cancelled (by user or admin)
  )),
  freshdesk_ticket_number TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requested_at ON deletion_requests(requested_at DESC);

-- ============================================================
-- TABLE: deletion_log
-- Audit trail of all anonymization actions taken
-- ============================================================
CREATE TABLE IF NOT EXISTS deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deletion_request_id UUID REFERENCES deletion_requests(id) ON DELETE SET NULL,
  user_id UUID,                    -- Original user_id (may be anonymized)
  action TEXT NOT NULL,            -- e.g., 'anonymize_profile', 'delete_grant_documents'
  table_name TEXT NOT NULL,         -- Table affected
  record_identifier TEXT,            -- How to find the record (e.g., grant_id, email hash)
  details JSONB,                    -- Additional context
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_deletion_log_user_id ON deletion_log(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_log_deletion_request_id ON deletion_log(deletion_request_id);
CREATE INDEX IF NOT EXISTS idx_deletion_log_performed_at ON deletion_log(performed_at DESC);

-- ============================================================
-- TABLE: deletion_documents_pending
-- Tracks grant documents pending review before deletion
-- ============================================================
CREATE TABLE IF NOT EXISTS deletion_documents_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deletion_request_id UUID NOT NULL REFERENCES deletion_requests(id) ON DELETE CASCADE,
  document_id UUID NOT NULL,           -- Reference to grant_documents.id
  filename TEXT NOT NULL,
  bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  grant_id UUID REFERENCES grants(id),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  action TEXT CHECK (action IN ('delete', 'retain', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for document review queries
CREATE INDEX IF NOT EXISTS idx_deletion_documents_pending_request ON deletion_documents_pending(deletion_request_id);

-- ============================================================
-- FUNCTION: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for deletion_requests
DROP TRIGGER IF EXISTS update_deletion_requests_updated_at ON deletion_requests;
CREATE TRIGGER update_deletion_requests_updated_at
  BEFORE UPDATE ON deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_documents_pending ENABLE ROW LEVEL SECURITY;

-- deletion_requests: Admin users can view all
CREATE POLICY "Admin users can view deletion requests"
  ON deletion_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- deletion_requests: Users can view their own requests
CREATE POLICY "Users can view their own deletion requests"
  ON deletion_requests FOR SELECT
  USING (user_id = auth.uid());

-- deletion_requests: Admin can insert (for admin-initiated requests)
CREATE POLICY "Admin can insert deletion requests"
  ON deletion_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- deletion_requests: Admin can update (status changes)
CREATE POLICY "Admin can update deletion requests"
  ON deletion_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- deletion_log: Admin can view all
CREATE POLICY "Admin can view deletion log"
  ON deletion_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- deletion_documents_pending: Admin can view all
CREATE POLICY "Admin can view deletion documents pending"
  ON deletion_documents_pending FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- deletion_documents_pending: Admin can update (review actions)
CREATE POLICY "Admin can update deletion documents pending"
  ON deletion_documents_pending FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role bypass (for internal API routes using supabaseAdmin)
CREATE POLICY "Service role can manage deletion tables"
  ON deletion_requests FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage deletion log"
  ON deletion_log FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage deletion documents pending"
  ON deletion_documents_pending FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================
-- NOTIFY PostgREST
-- ============================================================
NOTIFY pgrst, 'reload';
