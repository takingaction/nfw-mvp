-- Migration: 111_grant_scoring_schema.sql
-- Description: Add grant scoring tables for dual-reviewer system with RLS
-- Created: 2026-07-12

-- =============================================================================
-- GRANT_SCORES TABLE
-- =============================================================================
-- Stores individual reviewer scores for grant applications

CREATE TABLE IF NOT EXISTS grant_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    reviewer_name TEXT NOT NULL CHECK (reviewer_name IN ('first', 'second')),
    reviewer_admin_id UUID REFERENCES profiles(id),
    
    -- Scoring criteria (0-3, with 0.5 increments allowed)
    urgency_score NUMERIC(2,1) CHECK (urgency_score >= 0 AND urgency_score <= 3),
    authenticity_score NUMERIC(2,1) CHECK (authenticity_score >= 0 AND authenticity_score <= 3),
    impact_score NUMERIC(2,1) CHECK (impact_score >= 0 AND impact_score <= 3),
    
    -- Barriers flag
    barriers_yn BOOLEAN,
    
    -- Discussion flag (First reviewer only)
    needs_discussion BOOLEAN DEFAULT FALSE,
    discussion_notes TEXT,
    
    -- Completion tracking
    is_complete BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    
    -- Combined score (calculated: urgency + authenticity + impact)
    total_score NUMERIC(3,1),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(grant_id, reviewer_name)
);

-- Indexes for grant_scores
CREATE INDEX IF NOT EXISTS idx_grant_scores_grant_id ON grant_scores(grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_scores_reviewer ON grant_scores(reviewer_name);
CREATE INDEX IF NOT EXISTS idx_grant_scores_total ON grant_scores(total_score);

-- =============================================================================
-- GRANT_TENTATIVE_APPROVALS TABLE
-- =============================================================================
-- Stores tentative approval selections for grant applications

CREATE TABLE IF NOT EXISTS grant_tentative_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES grant_cycles(id) ON DELETE CASCADE,
    combined_score NUMERIC(3,1),
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(grant_id)
);

-- Indexes for grant_tentative_approvals
CREATE INDEX IF NOT EXISTS idx_tentative_cycle ON grant_tentative_approvals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_tentative_approved ON grant_tentative_approvals(is_approved);

-- =============================================================================
-- ADD COLUMNS TO GRANT_CYCLES
-- =============================================================================

ALTER TABLE grant_cycles ADD COLUMN IF NOT EXISTS scoring_started_at TIMESTAMPTZ;
ALTER TABLE grant_cycles ADD COLUMN IF NOT EXISTS scoring_completed_at TIMESTAMPTZ;
ALTER TABLE grant_cycles ADD COLUMN IF NOT EXISTS final_approved_at TIMESTAMPTZ;

-- =============================================================================
-- ADD COLUMNS TO GRANTS TABLE
-- =============================================================================

ALTER TABLE grants ADD COLUMN IF NOT EXISTS rachel_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE grants ADD COLUMN IF NOT EXISTS michelle_complete BOOLEAN DEFAULT FALSE;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE grant_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_tentative_approvals ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES FOR grant_scores
-- =============================================================================

-- Admin users can view all scores
CREATE POLICY "Admin users can view all grant scores"
  ON grant_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Admin users can insert scores
CREATE POLICY "Admin users can insert grant scores"
  ON grant_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Admin users can update scores
CREATE POLICY "Admin users can update grant scores"
  ON grant_scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- =============================================================================
-- RLS POLICIES FOR grant_tentative_approvals
-- =============================================================================

-- Admin users can view all tentative approvals
CREATE POLICY "Admin users can view all tentative approvals"
  ON grant_tentative_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Admin users can insert tentative approvals
CREATE POLICY "Admin users can insert tentative approvals"
  ON grant_tentative_approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Admin users can update tentative approvals
CREATE POLICY "Admin users can update tentative approvals"
  ON grant_tentative_approvals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Admin users can delete tentative approvals
CREATE POLICY "Admin users can delete tentative approvals"
  ON grant_tentative_approvals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Notify PostgREST of schema changes
NOTIFY pgrst, 'reload';
