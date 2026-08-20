-- Migration: 139_add_is_admin_only_to_nfw_perks.sql
-- Add is_admin_only field to nfw_perks for admin testing visibility

ALTER TABLE nfw_perks ADD COLUMN is_admin_only BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload';
