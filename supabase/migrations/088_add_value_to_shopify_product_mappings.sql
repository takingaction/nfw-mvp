-- Add value column to shopify_product_mappings for internal tracking
ALTER TABLE shopify_product_mappings ADD COLUMN value NUMERIC(10,2) DEFAULT 0;