-- Migration: Add meta_schema field to pages table
-- Created: 2026-04-25

ALTER TABLE pages ADD COLUMN meta_schema TEXT;
