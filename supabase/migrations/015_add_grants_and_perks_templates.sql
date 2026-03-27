-- Migration: 015_add_grants_and_perks_templates.sql
-- Description: Add 5 new section templates for grants page and merged perks/store grid
-- Created: 2026-03-27

-- 1. Grants Hero
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Grants Hero',
  'grants_hero',
  '{"eyebrow":"Now Accepting Applications","headline":"For the moments that matter.","subheadline":"Microgrants from $100 to $5,000 for bills, essentials, and unexpected costs. Simple to apply. Fast to receive.","cta_label":"Apply Today","cta_url":"/grants/apply","secondary_cta_label":"Become a Member","secondary_cta_url":"/auth/sign-up","trust_badges":["Real people review every application","Decisions within 48 hours","50 states served"],"image_url":"/images/microgrants-help.jpg","stat_value":"$2.5M+","stat_label":"Grants awarded to women nationwide","secondary_stat_value":"$100 – $5,000","secondary_stat_label":"per grant","background":"dove"}'::jsonb,
  true
);

-- 2. Grants Grid
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Grants Grid',
  'grants_grid',
  '{"eyebrow":"","headline":"Grants that help with real-life needs","subheadline":"Explore microgrants that cover emergencies, essentials, and the moments when life gets heavy.","cta_label":"Apply Today","cta_url":"/grants/apply","cards":[{"title":"$750 Healthcare Support","description":"Supports medical appointments, prescriptions, or urgent health costs that pop up when you least need them.","closing":"Closing Dec 31, 2026","image_url":"/images/microgrants-help.jpg"},{"title":"$100 Rainy Day Fund","description":"Quick relief for unexpected expenses — a bill, a co-pay, or anything that caught you off guard this month.","closing":"Closing Dec 31, 2026","image_url":"/images/microgrants-help.jpg"},{"title":"$300 Essentials Grant","description":"Helps with groceries, home basics, or a week''s worth of essentials during a tight month.","closing":"Closing Feb 8, 2026","image_url":"/images/microgrants-help.jpg"},{"title":"$5,000 Small Business Starter","description":"Provides seed funding for supplies, tools, or equipment to grow or launch a small business idea.","closing":"Closing Jan 11, 2027","image_url":"/images/microgrants-help.jpg"},{"title":"$2,500 Mobility and Work Grant","description":"Helps with transportation, job training, certifications, or anything that moves you forward.","closing":"Closing Jan 3, 2027","image_url":"/images/microgrants-help.jpg"},{"title":"$500 Childcare Support","description":"Covers childcare, school fees, or after-school care so it''s easier to work or keep appointments.","closing":"Closing Jan 11, 2027","image_url":"/images/microgrants-help.jpg"}],"background":"dove"}'::jsonb,
  true
);

-- 3. Grant Amount Cards
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Grant Amount Cards',
  'grant_amount_cards',
  '{"eyebrow":"Grant Amounts","headline":"How much you can receive","subheadline":"Microgrants come in different amounts depending on your need — all designed to give you quick, meaningful relief.","cta_label":"Apply Today","cta_url":"/grants/apply","items":[{"range":"$100 – $500","label":"Emergency Grants","description":"Urgent needs like utility payments, transit to work, childcare gaps, or groceries.","bg_tint":"powder"},{"range":"$500 – $2,500","label":"Stability Grants","description":"Housing deposits, certifications, or medical expenses not covered by insurance.","bg_tint":"citrine"},{"range":"$2,500 – $5,000","label":"Business and Growth Grants","description":"A boost to help you start or grow a small business idea with real potential.","bg_tint":"lilac"}],"background":"dove"}'::jsonb,
  true
);

-- 4. Success Stories
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Success Stories',
  'success_stories',
  '{"eyebrow":"Small wins matter","headline":"Success Stories and Everyday Wins","subheadline":"Feel-good moments from women supporting women.","cta_label":"See all stories","cta_url":"/articles","cards":[{"category":"Everyday Expense","bg_tint":"citrine","title":"A microgrant helped me fix my car and get back to work","image_url":"/images/microgrants-help.jpg"},{"category":"Parenting","bg_tint":"powder","title":"Covering an unexpected bill gave me room to breathe","image_url":"/images/microgrants-help.jpg"},{"category":"Medical Support","bg_tint":"lilac","title":"Getting support for medical costs eased so much stress","image_url":"/images/microgrants-help.jpg"}],"background":"dove"}'::jsonb,
  true
);

-- 5. Perks/Store Grid
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Perks/Store Grid',
  'perks_store_grid',
  '{"eyebrow":"1,000+ member-only deals available now","headline":"Everyday savings you can feel","subheadline":"Members get access to fresh deals on things you already spend money on.","cta_label":"Browse All Perks","cta_url":"/perks","cards":[{"category":"Insurance","name":"Fetch Pet Insurance","description":"5% off monthly premiums","color":"yellow"},{"category":"Travel","name":"Zipcar Car Sharing","description":"25% off annual membership","color":"blue"},{"category":"Health & Wellness","name":"Calm & Co.","description":"20% off mindfulness membership","color":"green"},{"category":"Health & Wellness","name":"CVS Pharmacy","description":"Savings & Discounts by Optum Rx","color":"green"},{"category":"Entertainment","name":"Ancestry","description":"50% off 1 year subscription","color":"lavender"},{"category":"Shopping & Groceries","name":"bistroMD","description":"25% off plus Free Shipping on your first order","color":"yellow"}],"background":"dove"}'::jsonb,
  true
);
