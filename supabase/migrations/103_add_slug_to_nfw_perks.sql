-- Migration: 103_add_slug_to_nfw_perks.sql
-- Add slug column to nfw_perks for cleaner URLs

ALTER TABLE nfw_perks ADD COLUMN slug TEXT UNIQUE;
CREATE INDEX idx_nfw_perks_slug ON nfw_perks(slug);

NOTIFY pgrst, 'reload';
