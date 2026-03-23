-- Migration: 004_add_shopify_tokens.sql
-- Description: Add shopify_tokens table for storing OAuth access tokens
-- Created: 2026-03-23

CREATE TABLE IF NOT EXISTS shopify_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by shop
CREATE INDEX IF NOT EXISTS idx_shopify_tokens_shop ON shopify_tokens(shop);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_shopify_tokens_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shopify_tokens_updated_at 
    BEFORE UPDATE ON shopify_tokens
    FOR EACH ROW EXECUTE FUNCTION update_shopify_tokens_updated_at_column();
