-- Migration: Add email column to profiles table and backfill existing emails
-- Created: 2026-05-27

-- 1. Add email column to profiles table
ALTER TABLE profiles ADD COLUMN email TEXT;

-- 2. Create trigger function to auto-sync email from auth.users on INSERT/UPDATE
-- SECURITY DEFINER is required because the trigger needs to read from auth.users
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  SELECT u.email INTO NEW.email
  FROM auth.users u
  WHERE u.id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger on profiles table
DROP TRIGGER IF EXISTS trg_sync_profile_email ON profiles;
CREATE TRIGGER trg_sync_profile_email
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email();

-- 4. Backfill existing profiles with emails from auth.users
UPDATE profiles p
SET email = (
  SELECT u.email
  FROM auth.users u
  WHERE u.id = p.id
)
WHERE p.email IS NULL OR p.email = '';

-- 5. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';