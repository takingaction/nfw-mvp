-- Add is_admin_only column to perk_collections table
ALTER TABLE perk_collections ADD COLUMN is_admin_only BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_perk_collections_admin_only ON perk_collections(is_admin_only) WHERE is_admin_only = true;

NOTIFY pgrst, 'reload';
