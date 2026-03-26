-- Migration: 010_update_section_color_options.sql
-- Description: Update section templates to use new color dropdowns and add background options
-- Created: 2026-03-26

-- Update right_side_3_features template
UPDATE section_templates
SET default_content = '{
  "eyebrow": "Why we exist",
  "headline": "Real support for real life moments",
  "body": "Women across America are navigating rising costs, caregiving pressures, wage gaps, and unexpected emergencies — often without a safety net. NFW was created to change that.\n\nWe believe that small, consistent support creates lasting change. Through microgrants, exclusive perks, and a community that truly gets it, we help women find relief — not someday, but today.",
  "cta_label": "Join the Community",
  "cta_url": "/auth/sign-up",
  "background": "dove",
  "items": [
    {"bg": "citrine", "title": "Celebrate every woman", "description": "We uplift and affirm all women — through daily life moments, feel-good content, and a community that champions your wins big and small."},
    {"bg": "lilac", "title": "Provide relief you can feel", "description": "From microgrants to perks to the Zero Dollar Store, every benefit is designed to ease real pressure in your everyday life."},
    {"bg": "powder", "title": "Champion shared interests", "description": "NFW advocates for women at the individual level and the collective level — because what is good for one woman is good for all of us."}
  ]
}'::jsonb
WHERE section_type = 'right_side_3_features';

-- Update 3_cards template
UPDATE section_templates
SET default_content = '{
  "eyebrow": "What membership includes",
  "headline": "Everything you need. Nothing you dont.",
  "background": "dove",
  "cards": [
    {"color": "green", "title": "Microgrants", "description": "Apply for grants from $100 to $5,000 to cover emergency bills, childcare, medical costs, car repairs, and more. Real people review every application within 48 hours.", "link": "/grants", "cta": "Learn about grants"},
    {"color": "blue", "title": "Perks and Discounts", "description": "Access 1,000+ member-only deals on groceries, wellness, travel, childcare, and everyday essentials. Members save an average of $500+ per year.", "link": "/perks/info", "cta": "Explore perks"},
    {"color": "yellow", "title": "Zero Dollar Store", "description": "Claim free essential items whenever you need them — hygiene products, household items, and more. No questions asked, no judgment.", "link": "/store", "cta": "Visit the store"}
  ]
}'::jsonb
WHERE section_type = '3_cards';

-- Update 4_cards template (color names changed to text)
UPDATE section_templates
SET default_content = '{
  "eyebrow": "Our community",
  "headline": "Women at every stage of life",
  "subheadline": "NFW membership is open to all women 18 and older residing in the United States. We welcome women from all backgrounds and circumstances.",
  "cards": [
    {"color": "yellow", "age": "18-34", "title": "Young Women", "description": "Navigating cost of living, student debt, and building a future in a complicated world."},
    {"color": "green", "age": "All ages", "title": "Moms of Young Kids", "description": "Balancing childcare costs, limited time, and the daily demands of raising a family."},
    {"color": "blue", "age": "Gen X", "title": "Moms of Older Kids", "description": "Managing college prep, work-life balance, and caring for loved ones all at once."},
    {"color": "lavender", "age": "55+", "title": "Grandmas and Elders", "description": "Living on fixed incomes while supporting the next generation and leaving a legacy."}
  ]
}'::jsonb
WHERE section_type = '4_cards';

-- Update perks_feature template to add background field
UPDATE section_templates
SET default_content = default_content || '{"background": "wisteria"}'::jsonb
WHERE section_type = 'perks_feature'
AND NOT (default_content ? 'background');
