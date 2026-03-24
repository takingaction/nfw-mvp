-- Migration: 009_add_donate_button.sql
-- Description: Add donate_label and donate_url columns to site_header
-- Created: 2026-03-23

ALTER TABLE site_header 
ADD COLUMN IF NOT EXISTS donate_label TEXT,
ADD COLUMN IF NOT EXISTS donate_url TEXT;
