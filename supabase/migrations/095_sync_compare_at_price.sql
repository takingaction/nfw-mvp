-- Add compare_at_price column for Shopify "compare at price" / "compareAtPrice" field
-- This stores the original retail price from Shopify for display as "Value: $X"
ALTER TABLE shopify_product_mappings ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(10,2) DEFAULT NULL;
