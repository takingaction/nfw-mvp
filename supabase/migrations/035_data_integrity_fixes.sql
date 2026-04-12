-- Migration: 035_data_integrity_fixes.sql
-- Description: Data integrity fixes - NOT NULL constraints, unique constraints, and gift code normalization
-- Created: 2026-04-12

-- =============================================================================
-- NOT NULL CONSTRAINTS
-- =============================================================================

-- profiles.full_name should be NOT NULL (used in communications)
ALTER TABLE profiles ALTER COLUMN full_name SET NOT NULL;

-- profiles.membership_level should be explicitly NOT NULL (has default but should be enforced)
ALTER TABLE profiles ALTER COLUMN membership_level SET NOT NULL;

-- grants essay fields - enforce NOT NULL even with CHECK constraints
ALTER TABLE grants ALTER COLUMN who_are_you SET NOT NULL;
ALTER TABLE grants ALTER COLUMN biggest_challenge SET NOT NULL;
ALTER TABLE grants ALTER COLUMN fund_usage SET NOT NULL;

-- =============================================================================
-- UNIQUE CONSTRAINTS
-- =============================================================================

-- profiles.access_perks_member_id should be unique per member (1:1 relationship)
-- Use partial unique index to allow multiple NULLs but enforce uniqueness for non-null values
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_access_perks_member_id 
    ON profiles(access_perks_member_id) 
    WHERE access_perks_member_id IS NOT NULL;

-- articles.slug must be unique (URL stability, SEO)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_articles_slug'
    ) THEN
        ALTER TABLE articles ADD CONSTRAINT uq_articles_slug UNIQUE (slug);
    END IF;
END $$;

-- article_categories.slug must be unique
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_article_categories_slug'
    ) THEN
        ALTER TABLE article_categories ADD CONSTRAINT uq_article_categories_slug UNIQUE (slug);
    END IF;
END $$;

-- =============================================================================
-- GIFT CODE NORMALIZATION (uppercase)
-- =============================================================================

-- Update generate_gift_code to return uppercase codes
CREATE OR REPLACE FUNCTION generate_gift_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed 0, O, 1, I to avoid confusion
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    -- Generate 8-character code using uppercase only
    WHILE i < 8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        i := i + 1;
    END LOOP;
    RETURN upper(result); -- Ensure uppercase
END;
$$ LANGUAGE plpgsql;

-- Normalize existing gift codes to uppercase
UPDATE gift_membership_codes SET code = upper(code) WHERE code IS NOT NULL AND code != upper(code);

-- Add check constraint to enforce uppercase for new codes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_gift_codes_code_uppercase'
    ) THEN
        ALTER TABLE gift_membership_codes ADD CONSTRAINT chk_gift_codes_code_uppercase 
            CHECK (code = upper(code));
    END IF;
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN profiles.full_name IS 'User full name - used in grant communications and notifications';
COMMENT ON COLUMN profiles.access_perks_member_id IS 'Unique Access Perks member identifier - 1:1 with profile';
COMMENT ON COLUMN articles.slug IS 'URL-friendly identifier - must be unique for SEO and routing';
COMMENT ON COLUMN article_categories.slug IS 'URL-friendly identifier - must be unique for routing';
