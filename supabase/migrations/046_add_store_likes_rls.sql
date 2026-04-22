-- Migration: Add RLS policies for store_likes table
-- Fixes 500 error on POST /api/perks/liked-stores

-- Enable RLS
ALTER TABLE store_likes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own liked stores
CREATE POLICY "Users can view their own liked stores"
  ON store_likes FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own liked stores
CREATE POLICY "Users can like stores"
  ON store_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own liked stores
CREATE POLICY "Users can unlike stores"
  ON store_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';