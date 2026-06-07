-- Migration: 076_fix_search_path_for_functions.sql
-- Purpose: Add SET search_path = pg_catalog to all functions to satisfy Supabase linter
-- Date: 2026-06-07

-- List of functions to update:
-- touch_updated_at, get_store_settings, publish_page, revert_page,
-- update_shopify_mappings_updated_at_column, auto_close_expired_grant_cycles,
-- unpublish_page, sync_profile_email, set_gift_code_if_empty, generate_gift_code,
-- expire_abandoned_claims, cleanup_monthly_claims_for_expired,
-- update_email_section_timestamp, update_updated_at_column

-- Helper function to update a single function
CREATE OR REPLACE FUNCTION update_function_search_path(func_name TEXT)
RETURNS void AS $$
DECLARE
  func_oid OID;
  func_def TEXT;
BEGIN
  SELECT oid INTO func_oid FROM pg_proc WHERE proname = func_name AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  IF func_oid IS NOT NULL THEN
    func_def := pg_get_functiondef(func_oid);
    
    -- Check if search_path is already set
    IF func_def NOT LIKE '%SET search_path%' THEN
      -- Add SET search_path = pg_catalog after AS keyword
      IF func_def LIKE '%RETURNS% LANGUAGE %' THEN
        -- For functions with LANGUAGE clause
        func_def := regexp_replace(func_def, '(LANGUAGE \w+)', '\1 SET search_path = pg_catalog', 'i');
      ELSIF func_def LIKE '%RETURNS% AS%' THEN
        -- For functions with AS keyword before LANGUAGE
        func_def := regexp_replace(func_def, '(RETURNS[^L]*AS)', '\1 SET search_path = pg_catalog', 'i');
      END IF;
      
      -- Execute the updated definition would require dynamic SQL
      -- Instead, we'll provide explicit ALTER FUNCTION statements
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Instead of dynamic approach, update each function explicitly
-- Note: These functions already exist and just need search_path set

-- For simplicity, we'll recreate the functions with proper search_path
-- This is the recommended Supabase approach

DROP TRIGGER IF EXISTS touch_updated_at ON profiles;
DROP FUNCTION IF EXISTS touch_updated_at();

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


DROP TRIGGER IF EXISTS update_shopify_mappings_updated_at_column ON shopify_product_mappings;
DROP FUNCTION IF EXISTS update_shopify_mappings_updated_at_column();

CREATE OR REPLACE FUNCTION update_shopify_mappings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


DROP TRIGGER IF EXISTS update_updated_at_column ON shopify_product_mappings;
DROP FUNCTION IF EXISTS update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


DROP TRIGGER IF EXISTS update_email_section_timestamp ON email_sections;
DROP FUNCTION IF EXISTS update_email_section_timestamp();

CREATE OR REPLACE FUNCTION update_email_section_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


DROP TRIGGER IF EXISTS auto_close_expired_grant_cycles ON grant_cycles;
DROP FUNCTION IF EXISTS auto_close_expired_grant_cycles();

CREATE OR REPLACE FUNCTION auto_close_expired_grant_cycles()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE grant_cycles
  SET status = 'closed'
  WHERE end_date < NOW()
  AND status = 'open';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


DROP TRIGGER IF EXISTS trg_auto_close_expired_grants ON grant_cycles;
DROP FUNCTION IF EXISTS auto_close_expired_grants();

CREATE OR REPLACE FUNCTION auto_close_expired_grants()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE grant_cycles
  SET status = 'closed'
  WHERE end_date < NOW()
  AND status = 'open';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


DROP TRIGGER IF EXISTS expire_abandoned_claims ON zero_dollar_claims;
DROP FUNCTION IF EXISTS expire_abandoned_claims();

CREATE OR REPLACE FUNCTION expire_abandoned_claims()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE zero_dollar_claims
  SET status = 'expired'
  WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '30 minutes';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


DROP TRIGGER IF EXISTS cleanup_monthly_claims_for_expired ON profiles;
DROP FUNCTION IF EXISTS cleanup_monthly_claims_for_expired();

CREATE OR REPLACE FUNCTION cleanup_monthly_claims_for_expired()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM monthly_claims
  WHERE user_id IN (
    SELECT id FROM profiles
    WHERE membership_level = 'free'
    AND (membership_level != 'free' OR membership_level IS NULL)
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


-- Store settings function (SECURITY DEFINER to read site_settings)
DROP FUNCTION IF EXISTS get_store_settings();
CREATE OR REPLACE FUNCTION get_store_settings()
RETURNS TABLE(
  id UUID,
  hero_image_url TEXT,
  hero_heading TEXT,
  hero_subheading TEXT,
  updated_at TIMESTAMPTZ,
  robots_txt TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY SELECT * FROM site_settings LIMIT 1;
END;
$$;


-- Profile email sync (SECURITY DEFINER to read auth.users)
-- Note: This is used by a trigger, so we need to ensure it works correctly
DROP TRIGGER IF EXISTS trg_sync_profile_email ON profiles;
DROP FUNCTION IF EXISTS sync_profile_email();

CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  SELECT u.email INTO NEW.email
  FROM auth.users u
  WHERE u.id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog;

CREATE TRIGGER trg_sync_profile_email
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email();


-- Gift code functions
DROP FUNCTION IF EXISTS generate_gift_code();
CREATE OR REPLACE FUNCTION generate_gift_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'NFW-GIFT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  RETURN code;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


DROP FUNCTION IF EXISTS set_gift_code_if_empty();
CREATE OR REPLACE FUNCTION set_gift_code_if_empty()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.gift_code IS NULL OR NEW.gift_code = '' THEN
    NEW.gift_code := 'NFW-GIFT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


-- Page publishing functions
DROP FUNCTION IF EXISTS publish_page(IN p_page_id UUID);
CREATE OR REPLACE FUNCTION publish_page(p_page_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Copy draft sections to live
  INSERT INTO page_sections (page_id, section_key, content, version, order_index)
  SELECT page_id, section_key, content, 'live', order_index
  FROM page_sections
  WHERE page_id = p_page_id AND version = 'draft'
  ON CONFLICT (page_id, section_key, version) DO UPDATE
    SET content = EXCLUDED.content, order_index = EXCLUDED.order_index;

  -- Update published_at
  UPDATE pages SET published_at = NOW(), updated_at = NOW() WHERE id = p_page_id;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


DROP FUNCTION IF EXISTS revert_page(IN p_page_id UUID);
CREATE OR REPLACE FUNCTION revert_page(p_page_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Copy live sections back to draft
  INSERT INTO page_sections (page_id, section_key, content, version, order_index)
  SELECT page_id, section_key, content, 'draft', order_index
  FROM page_sections
  WHERE page_id = p_page_id AND version = 'live'
  ON CONFLICT (page_id, section_key, version) DO UPDATE
    SET content = EXCLUDED.content, order_index = EXCLUDED.order_index;

  -- Clear published_at
  UPDATE pages SET published_at = NULL, updated_at = NOW() WHERE id = p_page_id;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


DROP FUNCTION IF EXISTS unpublish_page(IN p_page_id UUID);
CREATE OR REPLACE FUNCTION unpublish_page(p_page_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete live sections
  DELETE FROM page_sections WHERE page_id = p_page_id AND version = 'live';

  -- Clear published_at
  UPDATE pages SET published_at = NULL, updated_at = NOW() WHERE id = p_page_id;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog;


-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';