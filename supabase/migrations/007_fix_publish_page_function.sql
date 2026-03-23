-- Migration: 007_fix_publish_page_function.sql
-- Description: Fix publish_page to INSERT copies of draft to live (not move)
-- Created: 2026-03-23

CREATE OR REPLACE FUNCTION publish_page(p_page_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete all existing live sections first
    DELETE FROM page_sections
    WHERE page_id = p_page_id AND version = 'live';
    
    -- Copy all draft sections to live (INSERT new rows, don't move existing)
    INSERT INTO page_sections (page_id, section_type, version, order_index, content, visible)
    SELECT page_id, section_type, 'live', order_index, content, visible
    FROM page_sections
    WHERE page_id = p_page_id AND version = 'draft';
    
    -- Update page status
    UPDATE pages
    SET status = 'published'
    WHERE id = p_page_id;
END;
$$ LANGUAGE plpgsql;
