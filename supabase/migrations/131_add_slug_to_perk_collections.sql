-- Migration: Add slug to perk_collections
-- Created: 2026-07-23

-- Add slug column
ALTER TABLE perk_collections ADD COLUMN slug TEXT;

-- Create unique index (allows NULLs, multiple NULLs allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_perk_collections_slug ON perk_collections(slug) WHERE slug IS NOT NULL;

-- Auto-generate slugs for existing collections
UPDATE perk_collections
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
) || '-' || SUBSTR(GEN_RANDOM_uuid()::TEXT, 1, 4)
WHERE slug IS NULL;

-- Add updated_at trigger for slug updates
CREATE OR REPLACE FUNCTION update_perk_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog;

DROP TRIGGER IF EXISTS trg_update_perk_collections_updated_at ON perk_collections;
CREATE TRIGGER trg_update_perk_collections_updated_at
  BEFORE UPDATE ON perk_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_perk_collections_updated_at();

NOTIFY pgrst, 'reload';
