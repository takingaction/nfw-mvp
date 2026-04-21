-- Migration: Create store_likes table for user-saved Access Perks stores
-- Users can "like" stores to save them for quick reference in their dashboard

CREATE TABLE store_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_key TEXT NOT NULL, -- Access Perks store key (number as text)
  store_name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, store_key)
);

-- Index for faster lookups
CREATE INDEX idx_store_likes_user_id ON store_likes(user_id);
CREATE INDEX idx_store_likes_store_key ON store_likes(store_key);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
