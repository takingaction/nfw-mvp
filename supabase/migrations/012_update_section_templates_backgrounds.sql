-- Migration: 012_update_section_templates_backgrounds.sql
-- Description: Update all section templates with correct background defaults
-- Based on registry.ts defaultContent values

-- hero
UPDATE section_templates
SET default_content = jsonb_set(default_content, '{background}', '"aubergine"')
WHERE section_type = 'hero'
  AND NOT (default_content ? 'background');

-- hero_video
UPDATE section_templates
SET default_content = jsonb_set(default_content, '{background}', '"aubergine"')
WHERE section_type = 'hero_video'
  AND NOT (default_content ? 'background');

-- stats_bar
UPDATE section_templates
SET default_content = jsonb_set(default_content, '{background}', '"wisteria"')
WHERE section_type = 'stats_bar'
  AND NOT (default_content ? 'background');

-- mission_quote
UPDATE section_templates
SET default_content = jsonb_set(default_content, '{background}', '"dove"')
WHERE section_type = 'mission_quote'
  AND NOT (default_content ? 'background');

-- split_why_nfw
UPDATE section_templates
SET default_content = jsonb_set(default_content, '{background}', '"dove"')
WHERE section_type = 'split_why_nfw'
  AND NOT (default_content ? 'background');

-- microgrant_feature
UPDATE section_templates
SET default_content = jsonb_set(default_content, '{background}', '"dove"')
WHERE section_type = 'microgrant_feature'
  AND NOT (default_content ? 'background');

-- zero_dollar_store_teaser
UPDATE section_templates
SET default_content = jsonb_set(default_content, '{background}', '"dove"')
WHERE section_type = 'zero_dollar_store_teaser'
  AND NOT (default_content ? 'background');

-- split_everyday
UPDATE section_templates
SET default_content = jsonb_set(default_content, '{background}', '"wisteria"')
WHERE section_type = 'split_everyday'
  AND NOT (default_content ? 'background');

-- testimonials
UPDATE section_templates
SET default_content = jsonb_set(default_content, '{background}', '"dove"')
WHERE section_type = 'testimonials'
  AND NOT (default_content ? 'background');

-- faq
UPDATE section_templates
SET default_content = jsonb_set(default_content, '{background}', '"aubergine"')
WHERE section_type = 'faq'
  AND NOT (default_content ? 'background');

-- membership_cta
UPDATE section_templates
SET default_content = jsonb_set(default_content, '{background}', '"blackberry"')
WHERE section_type = 'membership_cta'
  AND NOT (default_content ? 'background');

-- 4_cards (was missing background field)
UPDATE section_templates
SET default_content = jsonb_set(default_content, '{background}', '"dove"')
WHERE section_type = '4_cards'
  AND NOT (default_content ? 'background');
