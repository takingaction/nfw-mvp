-- Add is_test_mode column to perks_settings table
-- When true, banner is only visible to admin users

ALTER TABLE perks_settings ADD COLUMN is_test_mode BOOLEAN DEFAULT FALSE;

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload';
