-- Migration: 172_add_deletion_columns_to_profiles.sql
-- Lets support identify anonymized profiles and link back to the
-- deletion_requests row that produced them. Mirrors the pattern
-- already used by auth.users.raw_user_meta_data->>'deletion_request_id'.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_request_id UUID REFERENCES deletion_requests(id);

-- Partial indexes: only anonymized rows are interesting to query by these fields.
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON profiles(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_request_id
  ON profiles(deletion_request_id)
  WHERE deletion_request_id IS NOT NULL;

NOTIFY pgrst, 'reload';
