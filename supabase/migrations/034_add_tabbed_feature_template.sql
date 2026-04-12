-- Migration: 034_add_tabbed_feature_template.sql
-- Description: Add tabbed_feature section template
-- Created: 2026-04-11

INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Tabbed Feature',
  'tabbed_feature',
  '{"background":"dove","items":[{"tab_label":"Discover","eyebrow":"Explore","headline":"Find new faves, every day.","headline_italic_phrase":"","body":"Find new products to obsess over in beauty, fitness, and more – from hundreds of brands.","image_url":"","cta_label":"Join Now","cta_url":"/auth/sign-up"},{"tab_label":"Access","eyebrow":"Exclusive","headline":"See new products. Unlock exclusives.","headline_italic_phrase":"","body":"Limited-edition drops, exclusive collabs, and partnerships—members get first dibs on it all.","image_url":"","cta_label":"Get Insider Access","cta_url":"/auth/sign-up"},{"tab_label":"Earn","eyebrow":"Rewards","headline":"Play your way to rewards","headline_italic_phrase":"","body":"Collect coins as you rise to new levels. Play in Challenges. Share current Obsessions. Earn instant rewards.","image_url":"","cta_label":"Start Earning","cta_url":"/auth/sign-up"}]}'::jsonb,
  true
);