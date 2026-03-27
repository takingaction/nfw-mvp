-- Migration: 016_add_testimonials_and_member_celebration_templates.sql
-- Description: Add testimonials grid and member celebration grid section templates
-- Created: 2026-03-27

-- 1. Testimonials Grid
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Testimonials Grid',
  'testimonials_grid',
  '{"eyebrow":"What members are saying","headline":"Real stories from our community","subheadline":"These everyday moments show how perks, savings and small bits of support can make life feel a little lighter.","cards":[{"quote":"I applied for a microgrant and within 48 hours I had the funds. It was such a relief.","name":"Sarah M.","role":"Member since 2023"},{"quote":"The perks program has saved me over $400 this year alone. It''s been a game-changer.","name":"Jennifer L.","role":"Founding Member"},{"quote":"Knowing there''s a community behind me makes all the difference. NFW feels like home.","name":"Maria R.","role":"Member since 2024"},{"quote":"I love that I can claim free essentials from the Zero Dollar Store whenever I need to.","name":"Ashley T.","role":"Contributing Member"},{"quote":"The grants helped me cover my car repairs so I could get back to work. So grateful.","name":"Demi W.","role":"Member since 2023"},{"quote":"Being part of NFW means having people in your corner. It''s more than a membership.","name":"Nicole B.","role":"Founding Member"}],"background":"dove"}'::jsonb,
  true
);

-- 2. Member Celebration Grid
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Member Celebration Grid',
  'member_celebration_grid',
  '{"eyebrow":"","headline":"Small wins matter. Let''s celebrate yours.","body":"Stories, joy, and tiny moments of relief. Every day.","cta_label":"Become a Member","cta_url":"/auth/sign-up","image1_url":"/images/member-1.jpg","image2_url":"/images/member-2.jpg","image3_url":"/images/member-3.jpg","image4_url":"/images/member-4.jpg","background":"dove"}'::jsonb,
  true
);
