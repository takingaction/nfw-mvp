-- Migration: 008_fix_unpublish_page.sql
-- Description: Fix unpublish_page to keep sections instead of deleting them
-- Created: 2026-03-23

CREATE OR REPLACE FUNCTION unpublish_page(p_page_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Just update the status - don't delete sections
    UPDATE pages
    SET status = 'unpublished'
    WHERE id = p_page_id;
END;
$$ LANGUAGE plpgsql;
