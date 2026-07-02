-- Migration: Sync Google OAuth full_name and avatar_url to profiles (CORRECTED)
-- Created: 2026-07-02
-- Note: INSERT only, only if NULL/empty - never overwrites user-entered data

-- Sync full_name and avatar_url from Google OAuth for Google users
-- SECURITY DEFINER is required because the trigger needs to read from auth.users
CREATE OR REPLACE FUNCTION sync_profile_google_data()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  -- Only sync for Google users on INSERT (not UPDATE)
  -- Only fill in NULL/empty values, don't override user-entered data
  IF TG_OP = 'INSERT' THEN
    IF NEW.raw_user_meta_data ? 'iss' AND NEW.raw_user_meta_data->>'iss' = 'https://accounts.google.com' THEN
      IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
        NEW.full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', 'Member');
      END IF;
      IF NEW.avatar_url IS NULL THEN
        NEW.avatar_url = NEW.raw_user_meta_data->>'avatar_url';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS trg_sync_profile_google_data ON profiles;
CREATE TRIGGER trg_sync_profile_google_data
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_google_data();

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
