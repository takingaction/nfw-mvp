-- Add store_logo_url column to offer_redemptions for thumbnail display
ALTER TABLE offer_redemptions ADD COLUMN store_logo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_offer_redemptions_store_logo_url ON offer_redemptions(store_logo_url);