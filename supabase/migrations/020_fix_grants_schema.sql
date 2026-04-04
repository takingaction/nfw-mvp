-- Migration: Fix grants table schema
-- Replaces the incorrect grants table with the correct NFW microgrants schema

-- Drop the existing grants table (with wrong schema)
DROP TABLE IF EXISTS grants CASCADE;

-- Create new grants table with correct NFW microgrants schema
CREATE TABLE IF NOT EXISTS grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES grant_cycles(id) ON DELETE RESTRICT,
    who_are_you TEXT NOT NULL CHECK (char_length(who_are_you) >= 10),
    biggest_challenge TEXT NOT NULL CHECK (char_length(biggest_challenge) >= 10),
    fund_usage TEXT NOT NULL CHECK (char_length(fund_usage) >= 10),
    is_nominating BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'approved', 'not_approved', 'payment_pending', 'payment_sent')),
    amount_approved NUMERIC(10, 2),
    admin_notes TEXT,
    stripe_connect_account_id TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id),
    funded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate applications: one application per user per cycle
    UNIQUE (user_id, cycle_id)
);

-- Indexes for grants
CREATE INDEX IF NOT EXISTS idx_grants_user_id ON grants(user_id);
CREATE INDEX IF NOT EXISTS idx_grants_cycle_id ON grants(cycle_id);
CREATE INDEX IF NOT EXISTS idx_grants_status ON grants(status);
CREATE INDEX IF NOT EXISTS idx_grants_submitted_at ON grants(submitted_at);

-- =============================================================================
-- GRANT_DOCUMENTS TABLE
-- =============================================================================
-- Documents uploaded for grant applications

DROP TABLE IF EXISTS grant_documents CASCADE;

CREATE TABLE IF NOT EXISTS grant_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),  -- Max 10MB
    created_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grant_documents_grant_id ON grant_documents(grant_id);

-- =============================================================================
-- RLS POLICIES FOR GRANTS
-- =============================================================================

ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_documents ENABLE ROW LEVEL SECURITY;

-- Admins can view all grants
CREATE POLICY "Admins can view all grants" ON grants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Admins can update all grants
CREATE POLICY "Admins can update all grants" ON grants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Users can view own grants
CREATE POLICY "Users can view own grants" ON grants
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create own grants
CREATE POLICY "Users can create own grants" ON grants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own grants (only when status is 'submitted')
CREATE POLICY "Users can update own submitted grants" ON grants
    FOR UPDATE USING (auth.uid() = user_id AND status = 'submitted');

-- Users can view their own grant documents
CREATE POLICY "Users can view own grant documents" ON grant_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM grants
            WHERE grants.id = grant_documents.grant_id
            AND grants.user_id = auth.uid()
        )
    );

-- Grant documents policies (admin)
CREATE POLICY "Admins can view all grant documents" ON grant_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );
