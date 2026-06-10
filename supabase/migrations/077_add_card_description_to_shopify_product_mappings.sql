-- Add card_description column to shopify_product_mappings for short plain-text card previews

ALTER TABLE shopify_product_mappings 
ADD COLUMN card_description TEXT;

CREATE INDEX IF NOT EXISTS idx_shopify_product_mappings_card_description 
ON shopify_product_mappings(card_description);

NOTIFY pgrst, 'reload';