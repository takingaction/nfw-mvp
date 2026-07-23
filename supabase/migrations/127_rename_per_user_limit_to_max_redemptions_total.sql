-- Rename per_user_limit to max_redemptions_total to accurately reflect its purpose
-- This column represents a GLOBAL limit on total redemptions, not a per-user limit

ALTER TABLE nfw_perks RENAME COLUMN per_user_limit TO max_redemptions_total;

-- Update any existing defaults from 1 to a more sensible default (unlimited = 0)
-- Note: 0 or NULL means unlimited, any positive number is the max total redemptions
ALTER TABLE nfw_perks ALTER COLUMN max_redemptions_total SET DEFAULT 0;

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload';
