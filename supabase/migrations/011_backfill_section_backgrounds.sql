-- Migration: 011_backfill_section_backgrounds.sql
-- Description: Backfill existing sections with correct default backgrounds
-- Based on original hardcoded values from homepage and about page

-- hero, hero_video: aubergine
UPDATE page_sections
SET content = jsonb_set(content, '{background}', '"aubergine"')
WHERE section_type IN ('hero', 'hero_video')
  AND content->>'background' IS NULL;

-- stats_bar, testimonials, perks_feature, split_everyday: wisteria
UPDATE page_sections
SET content = jsonb_set(content, '{background}', '"wisteria"')
WHERE section_type IN ('stats_bar', 'testimonials', 'perks_feature', 'split_everyday')
  AND content->>'background' IS NULL;

-- mission_quote, split_why_nfw, microgrant_feature, zero_dollar_store_teaser: dove
UPDATE page_sections
SET content = jsonb_set(content, '{background}', '"dove"')
WHERE section_type IN ('mission_quote', 'split_why_nfw', 'microgrant_feature', 'zero_dollar_store_teaser')
  AND content->>'background' IS NULL;

-- membership_cta: blackberry
UPDATE page_sections
SET content = jsonb_set(content, '{background}', '"blackberry"')
WHERE section_type = 'membership_cta'
  AND content->>'background' IS NULL;

-- faq: aubergine
UPDATE page_sections
SET content = jsonb_set(content, '{background}', '"aubergine"')
WHERE section_type = 'faq'
  AND content->>'background' IS NULL;
