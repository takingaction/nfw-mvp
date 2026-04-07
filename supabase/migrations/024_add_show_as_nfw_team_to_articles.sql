-- Migration: Add show_as_nfw_team column to articles
-- Created: 2026-04-07

ALTER TABLE articles 
ADD COLUMN show_as_nfw_team BOOLEAN DEFAULT false;
