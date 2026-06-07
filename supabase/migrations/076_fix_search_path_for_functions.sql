-- Migration: 076_fix_search_path_for_functions.sql
-- Purpose: Add SET search_path = pg_catalog to all functions to satisfy Supabase linter
-- Date: 2026-06-07

-- ============================================
-- TRIGGER FUNCTIONS (drop triggers first, then functions)
-- ============================================

-- touch_updated_at - used by multiple triggers
DROP TRIGGER IF EXISTS pages_updated_at ON pages;
DROP TRIGGER IF EXISTS sections_updated_at ON page_sections;
DROP TRIGGER IF EXISTS header_updated_at ON site_header;
DROP TRIGGER IF EXISTS footer_updated_at ON site_footer;
DROP FUNCTION IF EXISTS touch_updated_at();

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER sections_updated_at BEFORE UPDATE ON page_sections FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER header_updated_at BEFORE UPDATE ON site_header FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER footer_updated_at BEFORE UPDATE ON site_footer FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- update_shopify_mappings_updated_at_column
DROP TRIGGER IF EXISTS update_shopify_product_mappings_updated_at ON shopify_product_mappings;
DROP FUNCTION IF EXISTS update_shopify_mappings_updated_at_column();

CREATE OR REPLACE FUNCTION update_shopify_mappings_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_shopify_mappings_updated_at_column
  BEFORE UPDATE ON shopify_product_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_shopify_mappings_updated_at_column();


-- update_email_section_timestamp
DROP TRIGGER IF EXISTS email_sections_updated_at ON email_sections;
DROP FUNCTION IF EXISTS update_email_section_timestamp();

CREATE OR REPLACE FUNCTION update_email_section_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_email_section_timestamp
  BEFORE UPDATE ON email_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_email_section_timestamp();


-- ============================================
-- EVENT-TRIGGER FUNCTIONS (not attached to tables)
-- ============================================

-- auto_close_expired_grant_cycles (runs on schedule, not trigger)
DROP TRIGGER IF EXISTS trg_auto_close_expired_grants ON grant_cycles;
DROP FUNCTION IF EXISTS auto_close_expired_grant_cycles();

CREATE OR REPLACE FUNCTION auto_close_expired_grant_cycles()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE grant_cycles
  SET status = 'closed'
  WHERE end_date < NOW()
  AND status = 'open';
END;
$$;


-- expire_abandoned_claims
DROP FUNCTION IF EXISTS expire_abandoned_claims();

CREATE OR REPLACE FUNCTION expire_abandoned_claims()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE zero_dollar_claims
  SET status = 'expired'
  WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '30 minutes';
END;
$$;


-- cleanup_monthly_claims_for_expired
DROP FUNCTION IF EXISTS cleanup_monthly_claims_for_expired();

CREATE OR REPLACE FUNCTION cleanup_monthly_claims_for_expired()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  DELETE FROM monthly_claims
  WHERE user_id IN (
    SELECT id FROM profiles
    WHERE membership_level = 'free'
    AND (membership_level != 'free' OR membership_level IS NULL)
  );
END;
$$;


-- ============================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================

-- get_store_settings (SECURITY DEFINER to read site_settings)
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


-- sync_profile_email (SECURITY DEFINER to read auth.users)
DROP TRIGGER IF EXISTS trg_sync_profile_email ON profiles;
DROP FUNCTION IF EXISTS sync_profile_email();

CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  SELECT u.email INTO NEW.email
  FROM auth.users u
  WHERE u.id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_profile_email
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email();


-- ============================================
-- GIFT CODE FUNCTIONS
-- ============================================

-- generate_gift_code
DROP FUNCTION IF EXISTS generate_gift_code();

CREATE OR REPLACE FUNCTION generate_gift_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'NFW-GIFT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  RETURN code;
END;
$$;


-- set_gift_code_if_empty
DROP TRIGGER IF EXISTS set_gift_code_if_empty ON gift_membership_purchases;
DROP FUNCTION IF EXISTS set_gift_code_if_empty();

CREATE OR REPLACE FUNCTION set_gift_code_if_empty()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.gift_code IS NULL OR NEW.gift_code = '' THEN
    NEW.gift_code := 'NFW-GIFT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Note: This trigger should be on gift_membership_purchases table if needed


-- ============================================
-- PAGE PUBLISHING FUNCTIONS
-- ============================================

-- publish_page
DROP FUNCTION IF EXISTS publish_page(UUID);

CREATE OR REPLACE FUNCTION publish_page(p_page_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
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
$$;


-- revert_page
DROP FUNCTION IF EXISTS revert_page(UUID);

CREATE OR REPLACE FUNCTION revert_page(p_page_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
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
$$;


-- unpublish_page
DROP FUNCTION IF EXISTS unpublish_page(UUID);

CREATE OR REPLACE FUNCTION unpublish_page(p_page_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  -- Delete live sections
  DELETE FROM page_sections WHERE page_id = p_page_id AND version = 'live';

  -- Clear published_at
  UPDATE pages SET published_at = NULL, updated_at = NOW() WHERE id = p_page_id;
END;
$$;


-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';