-- Migration: 001_initial_schema.sql
-- Description: Initial database schema with improvements
-- Created: 2026-03-20
-- 
-- This migration captures the current database schema.
-- Run this in Supabase Dashboard > SQL Editor to apply changes.

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================
-- Stores extended user profile information linked to Supabase auth.users
-- 1:1 relationship with auth.users via id

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    zip TEXT,
    city TEXT,
    state TEXT,
    phone TEXT CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$'),  -- 10 digits only: 1234567890
    date_of_birth DATE,
    occupation TEXT,
    industry TEXT,
    company_name TEXT,
    company_website TEXT,
    linkedin_url TEXT,
    twitter_handle TEXT,
    membership_level TEXT DEFAULT 'free' CHECK (membership_level IN ('free', 'contributing', 'founding')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceling', 'cancelled')),
    subscription_ends_at TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT FALSE,
    stripe_connect_account_id TEXT,
    access_perks_member_id TEXT,
    access_perks_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_membership_level ON profiles(membership_level);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- =============================================================================
-- GRANT_CYCLES TABLE
-- =============================================================================
-- Grant funding periods/cycles that members can apply to

CREATE TABLE IF NOT EXISTS grant_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount_per_grant NUMERIC(10, 2) NOT NULL CHECK (amount_per_grant > 0),
    grants_available INTEGER NOT NULL CHECK (grants_available > 0),
    total_funds NUMERIC(10, 2) NOT NULL,
    available_funds NUMERIC(10, 2) NOT NULL CHECK (available_funds >= 0),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for grant_cycles
CREATE INDEX IF NOT EXISTS idx_grant_cycles_status ON grant_cycles(status);
CREATE INDEX IF NOT EXISTS idx_grant_cycles_start_date ON grant_cycles(start_date);
CREATE INDEX IF NOT EXISTS idx_grant_cycles_end_date ON grant_cycles(end_date);

-- =============================================================================
-- GRANTS TABLE
-- =============================================================================
-- Grant applications submitted by members

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
    reviewed_at TIMESTAMPTZ,                    -- Audit trail: when grant was reviewed
    reviewed_by UUID REFERENCES profiles(id),    -- Audit trail: which admin reviewed
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

CREATE TABLE IF NOT EXISTS grant_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),  -- Max 10MB
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for grant_documents
CREATE INDEX IF NOT EXISTS idx_grant_documents_grant_id ON grant_documents(grant_id);

-- =============================================================================
-- OFFER_REDEMPTIONS TABLE
-- =============================================================================
-- Access Perks offer redemptions tracked locally

CREATE TABLE IF NOT EXISTS offer_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    offer_key TEXT NOT NULL,
    usage_redeem_key TEXT,
    redeem_type TEXT CHECK (redeem_type IN ('instore', 'instore_print', 'link', 'call')),
    offer_title TEXT,
    store_name TEXT,
    location_name TEXT,
    offer_value TEXT,
    redemption_url TEXT,
    coupon_code TEXT,
    phone_number TEXT,
    instructions TEXT,
    display_message TEXT,
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'archived')),
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for offer_redemptions
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_user_id ON offer_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_status ON offer_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_redeemed_at ON offer_redemptions(redeemed_at);

-- =============================================================================
-- SITE_HEADER TABLE
-- =============================================================================
-- Site header configuration (singleton pattern - typically 1 row)

CREATE TABLE IF NOT EXISTS site_header (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logo_url TEXT,
    nav_links JSONB DEFAULT '[]'::jsonb,
    cta_label TEXT,
    cta_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PAGES TABLE
-- =============================================================================
-- CMS pages for the page builder

CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished')),
    preview_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for pages
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);

-- =============================================================================
-- PAGE_SECTIONS TABLE
-- =============================================================================
-- Content sections for pages

CREATE TABLE IF NOT EXISTS page_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL,
    version TEXT DEFAULT 'draft' CHECK (version IN ('draft', 'live')),
    order_index INTEGER DEFAULT 0,
    content JSONB DEFAULT '{}'::jsonb,
    visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for page_sections
CREATE INDEX IF NOT EXISTS idx_page_sections_page_id ON page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_page_sections_version ON page_sections(version);
CREATE INDEX IF NOT EXISTS idx_page_sections_page_version ON page_sections(page_id, version);

-- =============================================================================
-- SECTION_TEMPLATES TABLE
-- =============================================================================
-- Templates for page builder sections

CREATE TABLE IF NOT EXISTS section_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    section_type TEXT NOT NULL,
    default_content JSONB DEFAULT '{}'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for section_templates
CREATE INDEX IF NOT EXISTS idx_section_templates_is_system ON section_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_section_templates_section_type ON section_templates(section_type);

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grant_cycles_updated_at BEFORE UPDATE ON grant_cycles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grants_updated_at BEFORE UPDATE ON grants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_header_updated_at BEFORE UPDATE ON site_header
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_sections_updated_at BEFORE UPDATE ON page_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_section_templates_updated_at BEFORE UPDATE ON section_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RPC FUNCTIONS FOR PAGE BUILDER
-- =============================================================================

CREATE OR REPLACE FUNCTION publish_page(p_page_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Copy all draft sections to live
    UPDATE page_sections
    SET version = 'live'
    WHERE page_id = p_page_id AND version = 'draft';
    
    -- Update page status
    UPDATE pages
    SET status = 'published'
    WHERE id = p_page_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION revert_page(p_page_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete all draft sections
    DELETE FROM page_sections
    WHERE page_id = p_page_id AND version = 'draft';
    
    -- Copy live sections back to draft
    INSERT INTO page_sections (page_id, section_type, version, order_index, content, visible)
    SELECT page_id, section_type, 'draft', order_index, content, visible
    FROM page_sections
    WHERE page_id = p_page_id AND version = 'live';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION unpublish_page(p_page_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete all live sections
    DELETE FROM page_sections
    WHERE page_id = p_page_id AND version = 'live';
    
    -- Update page status
    UPDATE pages
    SET status = 'unpublished'
    WHERE id = p_page_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_header ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_templates ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Grants: Users can read/insert their own grants, admins can do everything
CREATE POLICY "Users can view own grants" ON grants
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own grants" ON grants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all grants" ON grants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can update all grants" ON grants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Grant cycles: Everyone can view, only admins can modify
CREATE POLICY "Grant cycles are viewable by everyone" ON grant_cycles
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage grant cycles" ON grant_cycles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Grant documents: Users can view/insert for own grants, admins can do everything
CREATE POLICY "Users can view own grant documents" ON grant_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM grants 
            WHERE grants.id = grant_documents.grant_id 
            AND grants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own grant documents" ON grant_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM grants 
            WHERE grants.id = grant_documents.grant_id 
            AND grants.user_id = auth.uid()
        )
    );

-- Offer redemptions: Users can manage their own
CREATE POLICY "Users can view own redemptions" ON offer_redemptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions" ON offer_redemptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own redemptions" ON offer_redemptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Site header: Admins can manage, everyone can view
CREATE POLICY "Site header is viewable by everyone" ON site_header
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage site header" ON site_header
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Pages: Everyone can view published, admins can manage all
CREATE POLICY "Published pages are viewable by everyone" ON pages
    FOR SELECT USING (status = 'published' OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can manage pages" ON pages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Page sections: Same as pages
CREATE POLICY "Page sections viewable with page" ON page_sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pages 
            WHERE pages.id = page_sections.page_id 
            AND (pages.status = 'published' OR 
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.is_admin = true
                ))
        )
    );

CREATE POLICY "Admins can manage page sections" ON page_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Section templates: Everyone can view, admins can manage
CREATE POLICY "Section templates are viewable by everyone" ON section_templates
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage section templates" ON section_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE profiles IS 'Extended user profile linked to Supabase auth.users';
COMMENT ON TABLE grants IS 'Grant applications submitted by members';
COMMENT ON TABLE grant_cycles IS 'Grant funding periods that members can apply to';
COMMENT ON TABLE grant_documents IS 'Document uploads for grant applications';
COMMENT ON TABLE offer_redemptions IS 'Access Perks offer redemptions tracked locally';
COMMENT ON TABLE site_header IS 'Site header configuration (singleton)';
COMMENT ON TABLE pages IS 'CMS pages for the page builder';
COMMENT ON TABLE page_sections IS 'Content sections for pages';
COMMENT ON TABLE section_templates IS 'Templates for page builder sections';
