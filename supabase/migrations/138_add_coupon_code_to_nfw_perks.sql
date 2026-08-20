-- Migration: 138_add_coupon_code_to_nfw_perks.sql
-- Add coupon_code field to nfw_perks table for promo codes

ALTER TABLE nfw_perks ADD COLUMN coupon_code TEXT;

NOTIFY pgrst, 'reload';
