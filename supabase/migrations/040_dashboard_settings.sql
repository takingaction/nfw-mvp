-- Migration: 040_dashboard_settings.sql
-- Description: Create dashboard settings table for configurable dashboard content
-- Created: 2026-04-17

-- =============================================================================
-- DASHBOARD SETTINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS dashboard_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    hero_image_url TEXT,
    featured_items JSONB DEFAULT '[]'::jsonb,
    square_image1_url TEXT,
    square_image1_link TEXT,
    square_image2_url TEXT,
    square_image2_link TEXT,
    square_image3_url TEXT,
    square_image3_link TEXT,
    badge_free_url TEXT,
    badge_contributing_url TEXT,
    badge_founding_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only allow one row
CREATE UNIQUE INDEX idx_dashboard_settings_single_row ON dashboard_settings((true));

COMMENT ON TABLE dashboard_settings IS 'Configurable dashboard content including hero image, featured items, and square images';

-- =============================================================================
-- GRANT CYCLES FEATURED IMAGE
-- =============================================================================

-- Add featured_image column to grant_cycles for microgrant images in dashboard
ALTER TABLE grant_cycles ADD COLUMN IF NOT EXISTS featured_image TEXT;

COMMENT ON COLUMN grant_cycles.featured_image IS 'Featured image URL for dashboard display';

-- =============================================================================
-- SEED DEFAULT SETTINGS
-- =============================================================================

INSERT INTO dashboard_settings (
    id,
    hero_image_url,
    featured_items,
    badge_free_url,
    badge_contributing_url,
    badge_founding_url,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '/images/landing.jpg',
    '[]'::jsonb,
    '/images/badge-free.png',
    '/images/badge-contributing.png',
    '/images/badge-founding.png',
    NOW()
) ON CONFLICT (id) DO NOTHING;
