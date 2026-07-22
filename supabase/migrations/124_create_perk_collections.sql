-- Migration: Create perk_collections tables
-- Created: 2026-07-21

-- perk_collections: stores collection metadata
CREATE TABLE IF NOT EXISTS perk_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- perk_collection_items: stores which perks belong to which collection
CREATE TABLE IF NOT EXISTS perk_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES perk_collections(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('access_perk', 'nfw_perk')),
  item_identifier TEXT NOT NULL,  -- offer_key for access_perk, slug for nfw_perk
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, item_type, item_identifier)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_perk_collections_active ON perk_collections(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_perk_collections_display_order ON perk_collections(display_order);
CREATE INDEX IF NOT EXISTS idx_perk_collection_items_collection ON perk_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_perk_collection_items_type ON perk_collection_items(item_type);

-- RLS policies
ALTER TABLE perk_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE perk_collection_items ENABLE ROW LEVEL SECURITY;

-- Public can view active collections with items
CREATE POLICY "Anyone can view active perk collections"
  ON perk_collections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view perk collection items"
  ON perk_collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM perk_collections
      WHERE perk_collections.id = perk_collection_items.collection_id
      AND perk_collections.is_active = true
    )
  );

-- Admin full access
CREATE POLICY "Admins can manage perk collections"
  ON perk_collections FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage perk collection items"
  ON perk_collection_items FOR ALL
  USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload';
