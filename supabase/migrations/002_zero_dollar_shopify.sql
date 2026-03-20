-- Migration: 002_zero_dollar_shopify.sql
-- Description: Add Shopify integration tables for Zero Dollar Store
-- Created: 2026-03-20

-- =============================================================================
-- SHOPIFY_PRODUCT_MAPPINGS TABLE
-- =============================================================================
-- Maps Shopify products to local MVP settings (visibility, eligibility)

CREATE TABLE IF NOT EXISTS shopify_product_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_product_id TEXT NOT NULL UNIQUE,
    shopify_variant_id TEXT NOT NULL,
    mvp_visibility BOOLEAN DEFAULT true,
    eligibility_tiers TEXT[] DEFAULT ARRAY['free', 'contributing', 'founding'],
    display_order INTEGER DEFAULT 999,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by product ID
CREATE INDEX IF NOT EXISTS idx_shopify_product_mappings_product_id ON shopify_product_mappings(shopify_product_id);

-- =============================================================================
-- UPDATE ZERO_DOLLAR_CLAIMS TABLE
-- =============================================================================
-- Add Shopify-specific fields to existing claims table

ALTER TABLE zero_dollar_claims 
ADD COLUMN IF NOT EXISTS shopify_product_id TEXT,
ADD COLUMN IF NOT EXISTS shopify_variant_id TEXT,
ADD COLUMN IF NOT EXISTS shopify_checkout_id TEXT,
ADD COLUMN IF NOT EXISTS shopify_order_id TEXT;

-- Drop old columns that are no longer needed (item_id, selected_variant, notes, etc.)
ALTER TABLE zero_dollar_claims 
DROP COLUMN IF EXISTS item_id,
DROP COLUMN IF EXISTS selected_variant,
DROP COLUMN IF EXISTS notes,
DROP COLUMN IF EXISTS shipped_at,
DROP COLUMN IF EXISTS delivered_at;

-- Update status enum to match new flow
ALTER TABLE zero_dollar_claims 
DROP COLUMN IF EXISTS status;

ALTER TABLE zero_dollar_claims 
ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'created', 'fulfilled', 'delivered'));

-- Update shipping_address structure
ALTER TABLE zero_dollar_claims 
ALTER COLUMN shipping_address TYPE JSONB USING shipping_address::JSONB;

-- Rename member_id to user_id for consistency (if member_id exists)
ALTER TABLE zero_dollar_claims 
RENAME COLUMN member_id TO user_id;

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_shopify_mappings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shopify_product_mappings_updated_at 
    BEFORE UPDATE ON shopify_product_mappings
    FOR EACH ROW EXECUTE FUNCTION update_shopify_mappings_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE shopify_product_mappings IS 'Maps Shopify products to MVP visibility and eligibility settings';
COMMENT ON COLUMN shopify_product_mappings.shopify_product_id IS 'Shopify product GID';
COMMENT ON COLUMN shopify_product_mappings.shopify_variant_id IS 'Shopify default variant GID';
COMMENT ON COLUMN shopify_product_mappings.mvp_visibility IS 'Whether to show in MVP store';
COMMENT ON COLUMN shopify_product_mappings.eligibility_tiers IS 'Membership tiers that can claim this product';
