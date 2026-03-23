-- Migration: 005_add_tracking_columns_to_claims.sql
-- Description: Add tracking_number and tracking_url columns to zero_dollar_claims
-- Created: 2026-03-23

ALTER TABLE zero_dollar_claims 
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS tracking_url TEXT;
