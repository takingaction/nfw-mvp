-- Migration: Add RPC function for incrementing lifetime_value
-- This function safely increments the lifetime_value column

CREATE OR REPLACE FUNCTION increment_lifetime_value(user_id UUID, increment_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE profiles
  SET lifetime_value = COALESCE(lifetime_value, 0) + increment_amount,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$;

NOTIFY pgrst, 'reload';
