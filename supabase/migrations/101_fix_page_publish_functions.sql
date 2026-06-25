-- Migration: 101_fix_page_publish_functions.sql
-- Description: Fix publish_page and revert_page functions
-- Bug: Migration 076 used wrong column name (section_key instead of section_type)
-- Fix: Use original 007 DELETE+INSERT pattern + 076 security fix (SET search_path)

-- ============================================
-- FIX PUBLISH_PAGE
-- ============================================
DROP FUNCTION IF EXISTS publish_page(UUID);

CREATE OR REPLACE FUNCTION publish_page(p_page_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  -- Delete all existing live sections first
  DELETE FROM page_sections
  WHERE page_id = p_page_id AND version = 'live';

  -- Copy all draft sections to live
  INSERT INTO page_sections (page_id, section_type, version, order_index, content, visible)
  SELECT page_id, section_type, 'live', order_index, content, visible
  FROM page_sections
  WHERE page_id = p_page_id AND version = 'draft';

  -- Update page status
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
SET search_path = pg_catalog
AS $$
BEGIN
  -- Delete all existing draft sections first
  DELETE FROM page_sections
  WHERE page_id = p_page_id AND version = 'draft';

  -- Copy all live sections back to draft
  INSERT INTO page_sections (page_id, section_type, version, order_index, content, visible)
  SELECT page_id, section_type, 'draft', order_index, content, visible
  FROM page_sections
  WHERE page_id = p_page_id AND version = 'live';

  -- Clear published_at
  UPDATE pages SET published_at = NULL, updated_at = NOW() WHERE id = p_page_id;
END;
$$;

-- ============================================
-- Notify PostgREST to reload schema cache
-- ============================================
NOTIFY pgrst, 'reload';
