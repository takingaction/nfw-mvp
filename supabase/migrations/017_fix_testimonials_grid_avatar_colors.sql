-- Migration: 017_fix_testimonials_grid_avatar_colors.sql
-- Description: Update testimonials_grid template with avatar_color field defaults
-- Created: 2026-03-27

-- Update the existing Testimonials Grid template with proper avatar_color values
UPDATE section_templates
SET default_content = '{"eyebrow":"What members are saying","headline":"Real stories from our community","subheadline":"These everyday moments show how perks, savings and small bits of support can make life feel a little lighter.","cards":[{"quote":"I applied for a microgrant and within 48 hours I had the funds. It was such a relief.","name":"Sarah M.","role":"Member since 2023","avatar_color":"citrine"},{"quote":"The perks program has saved me over $400 this year alone. It''s been a game-changer.","name":"Jennifer L.","role":"Founding Member","avatar_color":"green"},{"quote":"Knowing there''s a community behind me makes all the difference. NFW feels like home.","name":"Maria R.","role":"Member since 2024","avatar_color":"blue"},{"quote":"I love that I can claim free essentials from the Zero Dollar Store whenever I need to.","name":"Ashley T.","role":"Contributing Member","avatar_color":"lavender"},{"quote":"The grants helped me cover my car repairs so I could get back to work. So grateful.","name":"Demi W.","role":"Member since 2023","avatar_color":"lilac"},{"quote":"Being part of NFW means having people in your corner. It''s more than a membership.","name":"Nicole B.","role":"Founding Member","avatar_color":"powder"}],"background":"dove"}'::jsonb
WHERE section_type = 'testimonials_grid';
