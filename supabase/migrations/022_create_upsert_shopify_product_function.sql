-- Create RPC functions for Shopify product operations in internal schema
-- This bypasses PostgREST schema cache issues

CREATE OR REPLACE FUNCTION internal.upsert_shopify_product(
  p_shopify_product_id TEXT,
  p_shopify_variant_id TEXT,
  p_display_order INTEGER DEFAULT 1
) RETURNS void AS $$
BEGIN
  INSERT INTO internal.shopify_product_mappings (
    shopify_product_id,
    shopify_variant_id,
    eligibility_tiers,
    display_order
  ) VALUES (
    p_shopify_product_id,
    p_shopify_variant_id,
    '["free","contributing","founding"]'::jsonb,
    p_display_order
  )
  ON CONFLICT (shopify_product_id) DO UPDATE SET
    shopify_variant_id = EXCLUDED.shopify_variant_id,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION internal.get_all_shopify_mappings()
RETURNS TABLE (
  id UUID,
  shopify_product_id TEXT,
  shopify_variant_id TEXT,
  mvp_visibility BOOLEAN,
  eligibility_tiers JSONB,
  display_order INTEGER,
  featured_order INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT 
    m.id,
    m.shopify_product_id,
    m.shopify_variant_id,
    m.mvp_visibility,
    m.eligibility_tiers,
    m.display_order,
    m.featured_order
  FROM internal.shopify_product_mappings m
  ORDER BY m.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
