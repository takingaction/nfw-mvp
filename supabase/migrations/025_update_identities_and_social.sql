-- Migration 025: Update identities and social handles for NFW
-- Created: 2026-04-07

-- Set "Prefer not to say" for ALL existing profiles (ensures no one is blocked by validation)
UPDATE profiles 
SET identities = ARRAY['Prefer not to say'];

-- Remove twitter from all existing social_handles JSONB
UPDATE profiles 
SET social_handles = social_handles - 'twitter'
WHERE social_handles ? 'twitter';