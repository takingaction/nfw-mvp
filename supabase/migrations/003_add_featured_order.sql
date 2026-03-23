-- Migration: 003_add_featured_order.sql
-- Description: Add featured_order column separate from display_order
-- Created: 2026-03-23

ALTER TABLE shopify_product_mappings 
ADD COLUMN IF NOT EXISTS featured_order INTEGER DEFAULT 999;

CREATE INDEX IF NOT EXISTS idx_shopify_product_mappings_featured_order 
ON shopify_product_mappings(featured_order);
