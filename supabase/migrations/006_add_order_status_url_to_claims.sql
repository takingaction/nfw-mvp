-- Migration: 006_add_order_status_url_to_claims.sql
-- Description: Add order_status_url column to zero_dollar_claims for Shopify order status page
-- Created: 2026-03-23

ALTER TABLE zero_dollar_claims 
ADD COLUMN IF NOT EXISTS order_status_url TEXT;
