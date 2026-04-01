-- Move shopify_product_mappings back to public schema
-- This reverts the security isolation in favor of simpler, more stable direct access

-- Move table from internal back to public
ALTER TABLE internal.shopify_product_mappings SET SCHEMA public;

-- Clean up RPC functions (no longer needed)
DROP FUNCTION IF EXISTS public.upsert_shopify_product(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_all_shopify_mappings();
DROP FUNCTION IF EXISTS internal.upsert_shopify_product(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS internal.get_all_shopify_mappings();
