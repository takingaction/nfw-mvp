-- Move shopify_product_mappings to protected internal schema
-- This removes it from PostgREST public exposure

CREATE SCHEMA IF NOT EXISTS internal;

ALTER TABLE public.shopify_product_mappings SET SCHEMA internal;

-- Verify the move
SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'shopify_product_mappings';
