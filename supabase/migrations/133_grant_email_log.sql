-- Migration: 133_grant_email_log.sql
-- Description: Track grant email sends with status
-- Created: 2026-08-03

-- =============================================================================
-- GRANT_EMAIL_LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS grant_email_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES grant_cycles(id) ON DELETE CASCADE,
    email_type TEXT NOT NULL CHECK (email_type IN ('approved', 'rejected')),
    recipient_email TEXT NOT NULL,
    resend_email_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    retry_count INT DEFAULT 0
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_grant_email_log_cycle_id ON grant_email_log(cycle_id);
CREATE INDEX IF NOT EXISTS idx_grant_email_log_grant_id ON grant_email_log(grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_email_log_status ON grant_email_log(status);
CREATE INDEX IF NOT EXISTS idx_grant_email_log_email ON grant_email_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_grant_email_log_type_status ON grant_email_log(email_type, status);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE grant_email_log ENABLE ROW LEVEL SECURITY;

-- Admin users can view and manage all records
CREATE POLICY "Admin can manage grant_email_log"
  ON grant_email_log FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- =============================================================================
-- NOTIFY PGRST
-- =============================================================================

NOTIFY pgrst, 'reload';
