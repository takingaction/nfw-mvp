-- Migration: Add avatar_url column to profiles table
-- This column stores the public URL of the user's profile avatar

ALTER TABLE profiles ADD COLUMN avatar_url TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;
