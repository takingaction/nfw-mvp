-- Migration: 102_fix_page_functions_search_path.sql
-- Description: Fix search_path in publish_page and revert_page functions
-- Bug: SET search_path = pg_catalog only looks in system tables
-- Fix: SET search_path = pg_catalog, public (looks in pg_catalog first, then public)

-- ============================================
-- FIX PUBLISH_PAGE
-- ============================================
DROP FUNCTION IF EXISTS publish_page(UUID);

CREATE OR REPLACE FUNCTION publish_page(p_page_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  DELETE FROM page_sections
  WHERE page_id = p_page_id AND version = 'live';

  INSERT INTO page_sections (page_id, section_type, version, order_index, content, visible)
  SELECT page_id, section_type, 'live', order_index, content, visible
  FROM page_sections
  WHERE page_id = p_page_id AND version = 'draft';

  UPDATE pages SET status = 'published' WHERE id = p_page_id;
END;
$$;

-- ============================================
-- FIX REVERT_PAGE
-- ============================================
DROP FUNCTION IF EXISTS revert_page(UUID);

CREATE OR REPLACE FUNCTION revert_page(p_page_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  DELETE FROM page_sections
  WHERE page_id = p_page_id AND version = 'draft';

  INSERT INTO page_sections (page_id, section_type, version, order_index, content, visible)
  SELECT page_id, section_type, 'draft', order_index, content, visible
  FROM page_sections
  WHERE page_id = p_page_id AND version = 'live';

  UPDATE pages SET published_at = NULL, updated_at = NOW() WHERE id = p_page_id;
END;
$$;

-- ============================================
-- Notify PostgREST to reload schema cache
-- ============================================
NOTIFY pgrst, 'reload';
