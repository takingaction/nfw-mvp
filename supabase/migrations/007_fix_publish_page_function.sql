-- Migration: 007_fix_publish_page_function.sql
-- Description: Fix publish_page to delete existing live sections before copying draft to live
-- Created: 2026-03-23

CREATE OR REPLACE FUNCTION publish_page(p_page_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete all existing live sections first (to avoid unique constraint conflicts)
    DELETE FROM page_sections
    WHERE page_id = p_page_id AND version = 'live';
    
    -- Copy all draft sections to live
    UPDATE page_sections
    SET version = 'live'
    WHERE page_id = p_page_id AND version = 'draft';
    
    -- Update page status
    UPDATE pages
    SET status = 'published'
    WHERE id = p_page_id;
END;
$$ LANGUAGE plpgsql;
