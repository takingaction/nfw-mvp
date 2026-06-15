-- Enable RLS on monthly_claims table
-- This table tracks monthly claim limits for the Zero Dollar Store

-- Enable RLS
ALTER TABLE monthly_claims ENABLE ROW LEVEL SECURITY;

-- Users can only view their own monthly claims
CREATE POLICY "Users can view their own monthly claims"
  ON monthly_claims FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own monthly claims (check constraints handle validity)
CREATE POLICY "Users can insert their own monthly claims"
  ON monthly_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own monthly claims (for cleanup/edge cases)
CREATE POLICY "Users can delete their own monthly claims"
  ON monthly_claims FOR DELETE
  USING (auth.uid() = user_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';