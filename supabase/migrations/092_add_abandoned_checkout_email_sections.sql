-- Add default email sections for abandoned-checkout-recovery template
-- This migration inserts sections that will appear in the email builder

DO $$
DECLARE
  template_id UUID;
BEGIN
  -- Get the template ID
  SELECT id INTO template_id
  FROM email_templates
  WHERE slug = 'abandoned-checkout-recovery';

  IF NOT FOUND THEN
    RAISE NOTICE 'Abandoned checkout email template not found, skipping section creation';
    RETURN;
  END IF;

  -- Delete any existing sections for this template
  DELETE FROM email_sections WHERE email_template_id = template_id;

  -- Insert default sections
  -- 1. Hero section with welcome image
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    template_id,
    'email_hero',
    0,
    '{"image_url": "https://nationalfundforwomen.org/images/email-welcome-hero.jpg", "hero_text": "Complete your <em>membership</em>", "text_color": "#FFFFFF", "overlay_position": "center"}',
    true,
    'dove'
  );

  -- 2. Headline section
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    template_id,
    'email_text',
    1,
    '{"text": "You left something behind", "text_align": "center", "font_family": "Playfair Display", "font_size": 28}',
    true,
    'lilac'
  );

  -- 3. Body text
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    template_id,
    'email_text',
    2,
    '{"text": "Hi {{name}},<br><br>You started your NFW membership checkout but did not finish. Your impact is waiting — complete your purchase below.<br><br>If you have any questions, simply reply to this email and we will help you out.<br><br>Warmly,<br>The National Fund for Women Team", "text_align": "center", "font_family": "DM Sans", "font_size": 16}',
    true,
    'lilac'
  );

  -- 4. CTA Button
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    template_id,
    'email_cta',
    3,
    '{"button_text": "COMPLETE YOUR MEMBERSHIP", "button_url": "{{ctaUrl}}", "button_color": "citrine", "text_align": "center"}',
    true,
    'lilac'
  );

  -- 5. Spacer
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    template_id,
    'email_spacer',
    4,
    '{"height": 30}',
    true,
    'lilac'
  );

  RAISE NOTICE 'Created default sections for abandoned-checkout-recovery template';
END $$;

NOTIFY pgrst, 'reload';
