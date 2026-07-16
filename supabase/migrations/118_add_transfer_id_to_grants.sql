-- Migration: 118_add_transfer_id_to_grants
-- Adds transfer_id column to track Stripe transfer IDs for paid grants

ALTER TABLE grants ADD COLUMN transfer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_grants_transfer_id ON grants(transfer_id);

NOTIFY pgrst, 'reload';
