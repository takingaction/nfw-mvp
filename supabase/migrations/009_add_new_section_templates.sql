-- Migration: 009_add_new_section_templates.sql
-- Description: Add Right Side 3 Features, 4 Cards, and 3 Cards section templates
-- Created: 2026-03-26

INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Right Side 3 Features',
  'right_side_3_features',
  '{"eyebrow":"Why we exist","headline":"Real support for real life moments","body":"Women across America are navigating rising costs, caregiving pressures, wage gaps, and unexpected emergencies — often without a safety net. NFW was created to change that.\n\nWe believe that small, consistent support creates lasting change. Through microgrants, exclusive perks, and a community that truly gets it, we help women find relief — not someday, but today.","cta_label":"Join the Community","cta_url":"/auth/sign-up","items":[{"bg":"bg-nfw-citrine/20","title":"Celebrate every woman","description":"We uplift and affirm all women — through daily life moments, feel-good content, and a community that champions your wins big and small."},{"bg":"bg-nfw-lilac/20","title":"Provide relief you can feel","description":"From microgrants to perks to the Zero Dollar Store, every benefit is designed to ease real pressure in your everyday life."},{"bg":"bg-nfw-powder/20","title":"Champion shared interests","description":"NFW advocates for women at the individual level and the collective level — because what''s good for one woman is good for all of us."}]}'::jsonb,
  true
);

INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  '4 Cards',
  '4_cards',
  '{"eyebrow":"Our community","headline":"Women at every stage of life","subheadline":"NFW membership is open to all women 18 and older residing in the United States. We welcome women from all backgrounds and circumstances.","cards":[{"color":"#fdf493","age":"18-34","title":"Young Women","description":"Navigating cost of living, student debt, and building a future in a complicated world."},{"color":"#d4f1ad","age":"All ages","title":"Moms of Young Kids","description":"Balancing childcare costs, limited time, and the daily demands of raising a family."},{"color":"#b2d1ee","age":"Gen X","title":"Moms of Older Kids","description":"Managing college prep, work-life balance, and caring for loved ones all at once."},{"color":"#bcafcf","age":"55+","title":"Grandmas and Elders","description":"Living on fixed incomes while supporting the next generation and leaving a legacy."}]}'::jsonb,
  true
);

INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  '3 Cards',
  '3_cards',
  '{"eyebrow":"What membership includes","headline":"Everything you need. Nothing you don''t.","cards":[{"color":"#d4f1ad","title":"Microgrants","description":"Apply for grants from $100 to $5,000 to cover emergency bills, childcare, medical costs, car repairs, and more. Real people review every application within 48 hours.","link":"/grants","cta":"Learn about grants"},{"color":"#b2d1ee","title":"Perks and Discounts","description":"Access 1,000+ member-only deals on groceries, wellness, travel, childcare, and everyday essentials. Members save an average of $500+ per year.","link":"/perks/info","cta":"Explore perks"},{"color":"#fdf493","title":"Zero Dollar Store","description":"Claim free essential items whenever you need them — hygiene products, household items, and more. No questions asked, no judgment.","link":"/store","cta":"Visit the store"}]}'::jsonb,
  true
);
