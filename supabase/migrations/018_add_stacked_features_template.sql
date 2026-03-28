-- Migration: 018_add_stacked_features_template.sql
-- Description: Add stacked_features section template
-- Created: 2026-03-28

INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Stacked Features',
  'stacked_features',
  '{"columns":[{"image_url":"","image_overlay":true,"bg_color":"powder","eyebrow":"Community","heading":"Built on Connection","body":"NFW brings people together through shared experiences, mutual support, and a commitment to helping each other thrive.","bullets":[],"cta_label":"","cta_url":""},{"image_url":"","image_overlay":true,"bg_color":"citrine","eyebrow":"Impact","heading":"Real Support","body":"From microgrants to everyday perks, we provide tangible resources that make a difference in people''s daily lives.","bullets":[],"cta_label":"","cta_url":""},{"image_url":"","image_overlay":true,"bg_color":"lilac","eyebrow":"Growth","heading":"Growing Together","body":"Our community is built on the belief that when we uplift each other, everyone benefits and grows.","bullets":[],"cta_label":"","cta_url":""}]}'::jsonb,
  true
);
