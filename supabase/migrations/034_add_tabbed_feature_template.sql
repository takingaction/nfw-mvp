-- Migration: 034_add_tabbed_feature_template.sql
-- Description: Add tabbed_feature section template
-- Created: 2026-04-11

INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Tabbed Feature',
  'tabbed_feature',
  '{"background":"dove","items":[{"tab_label":"Grants","eyebrow":"Microgrants","headline":"Apply for microgrants up to $5,000","headline_italic_phrase":"","body":"Every month, we award microgrants to help women thrive. Apply for rent assistance, medical bills, education, and more.","image_url":"","cta_label":"Apply Now","cta_url":"/grants/apply"},{"tab_label":"Perks","eyebrow":"Member Savings","headline":"Save hundreds on everyday essentials","headline_italic_phrase":"","body":"Access exclusive discounts on groceries, gas, travel, and more. Our perks program saves members hundreds every year.","image_url":"","cta_label":"Explore Perks","cta_url":"/perks"},{"tab_label":"Community","eyebrow":"Join the Network","headline":"Connect with women nationwide","headline_italic_phrase":"","body":"You're not alone. Join thousands of women sharing resources, support, and a commitment to lifting each other up.","image_url":"","cta_label":"Join Free","cta_url":"/auth/sign-up"}]}'::jsonb,
  true
);