-- Add title and image_url columns to shopify_product_mappings
-- These will be synced from Shopify and updated on each sync

ALTER TABLE shopify_product_mappings ADD COLUMN title TEXT;
ALTER TABLE shopify_product_mappings ADD COLUMN image_url TEXT;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_shopify_product_mappings_title ON shopify_product_mappings(title);

NOTIFY pgrst, 'reload';