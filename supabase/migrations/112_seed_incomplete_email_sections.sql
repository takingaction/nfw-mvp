-- Seed default email sections for incomplete member reengagement template

DO $$
DECLARE
  template_id UUID;
BEGIN
  -- Get template ID
  SELECT id INTO template_id FROM email_templates WHERE slug = 'incomplete-member-reengagement';

  -- Clear existing sections
  DELETE FROM email_sections WHERE email_template_id = template_id;

  -- 1. Hero
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    template_id,
    'email_hero',
    0,
    '{"image_url": "https://nationalfundforwomen.org/images/email-welcome-hero.jpg", "hero_text": "Complete your membership", "text_color": "#FFFFFF", "overlay_position": "center"}',
    true,
    'dove'
  );

  -- 2. Headline
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    template_id,
    'email_text',
    1,
    '{"text": "You''re almost there, {{name}}!", "text_align": "center", "font_family": "Playfair Display", "font_size": 28}',
    true,
    'lilac'
  );

  -- 3. Body
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    template_id,
    'email_text',
    2,
    '{"text": "You started signing up for NFW but haven''t completed your profile yet. You''re just a few steps away from accessing:", "text_align": "center", "font_family": "DM Sans", "font_size": 16}',
    true,
    'lilac'
  );

  -- 4. Benefits list
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    template_id,
    'email_columns',
    3,
    '{"columns": [{"text": "Monthly microgrants for women"}, {"text": "Everyday discounts at stores you already shop"}, {"text": "The Zero Dollar Store with free products"}], "text_align": "center", "font_family": "DM Sans", "font_size": 16}',
    true,
    'lilac'
  );

  -- 5. CTA
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    template_id,
    'email_cta',
    4,
    '{"button_text": "COMPLETE YOUR PROFILE", "button_url": "{{signup_url}}", "button_color": "citrine", "text_align": "center"}',
    true,
    'lilac'
  );

  -- 6. Spacer
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    template_id,
    'email_spacer',
    5,
    '{"height": 30}',
    true,
    'lilac'
  );

  RAISE NOTICE 'Seeded incomplete member reengagement email sections successfully';
END $$;

NOTIFY pgrst, 'reload';