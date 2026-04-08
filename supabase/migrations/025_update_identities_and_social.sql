-- Migration 025: Update identities and social handles for NFW
-- Created: 2026-04-07

-- Clear any existing identity data and set "Prefer not to say" as default
-- This ensures existing profiles aren't blocked by validation
UPDATE profiles 
SET identities = ARRAY['Prefer not to say'] 
WHERE identities IS NULL OR array_length(identities, 1) = 0;

-- Also reset all identities to the default (users will re-select if needed)
-- Comment out the line above if you want to preserve existing selections
-- UPDATE profiles SET identities = ARRAY['Prefer not to say'];

-- Remove twitter from all existing social_handles JSONB
UPDATE profiles 
SET social_handles = social_handles - 'twitter'
WHERE social_handles ? 'twitter';