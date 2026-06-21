-- Seed default email sections for grant email templates
-- Also updates subject lines for grant-approved and grant-not-approved

DO $$
DECLARE
  -- Template IDs
  approved_template_id UUID;
  not_approved_template_id UUID;
  payment_pending_template_id UUID;
  payment_sent_template_id UUID;
BEGIN
  -- Update subject lines
  UPDATE email_templates SET subject = 'Your microgrant is approved!' WHERE slug = 'grant-approved';
  UPDATE email_templates SET subject = 'An update on your NFW microgrant application' WHERE slug = 'grant-not-approved';

  -- Get template IDs
  SELECT id INTO approved_template_id FROM email_templates WHERE slug = 'grant-approved';
  SELECT id INTO not_approved_template_id FROM email_templates WHERE slug = 'grant-not-approved';
  SELECT id INTO payment_pending_template_id FROM email_templates WHERE slug = 'grant-payment-pending';
  SELECT id INTO payment_sent_template_id FROM email_templates WHERE slug = 'grant-payment-sent';

  -- Helper: delete existing sections for a template
  -- We can't use a function easily, so we'll do it inline for each

  -- ============================================
  -- GRANT APPROVED SECTIONS
  -- ============================================
  DELETE FROM email_sections WHERE email_template_id = approved_template_id;

  -- 1. Hero
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    approved_template_id,
    'email_hero',
    0,
    '{"image_url": "https://nationalfundforwomen.org/images/email-welcome-hero.jpg", "hero_text": "Your microgrant is approved!", "text_color": "#FFFFFF", "overlay_position": "center"}',
    true,
    'dove'
  );

  -- 2. Headline
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    approved_template_id,
    'email_text',
    1,
    '{"text": "Congratulations, {{name}}!", "text_align": "center", "font_family": "Playfair Display", "font_size": 28}',
    true,
    'lilac'
  );

  -- 3. Body
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    approved_template_id,
    'email_text',
    2,
    '{"text": "Great news! Your application for the {{grantCycleName}} grant has been approved. We''re excited to support your work. Next steps will be sent shortly.", "text_align": "center", "font_family": "DM Sans", "font_size": 16}',
    true,
    'lilac'
  );

  -- 4. CTA
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    approved_template_id,
    'email_cta',
    3,
    '{"button_text": "VIEW YOUR DASHBOARD", "button_url": "{{dashboard_url}}", "button_color": "citrine", "text_align": "center"}',
    true,
    'lilac'
  );

  -- 5. Spacer
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    approved_template_id,
    'email_spacer',
    4,
    '{"height": 30}',
    true,
    'lilac'
  );

  -- ============================================
  -- GRANT NOT APPROVED SECTIONS
  -- ============================================
  DELETE FROM email_sections WHERE email_template_id = not_approved_template_id;

  -- 1. Hero
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    not_approved_template_id,
    'email_hero',
    0,
    '{"image_url": "https://nationalfundforwomen.org/images/email-welcome-hero.jpg", "hero_text": "An update on your application", "text_color": "#FFFFFF", "overlay_position": "center"}',
    true,
    'dove'
  );

  -- 2. Headline
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    not_approved_template_id,
    'email_text',
    1,
    '{"text": "Thank You for Applying", "text_align": "center", "font_family": "Playfair Display", "font_size": 28}',
    true,
    'lilac'
  );

  -- 3. Body
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    not_approved_template_id,
    'email_text',
    2,
    '{"text": "Dear {{name}}, thank you for your interest in the {{grantCycleName}} grant program. After careful review, we''re unable to move forward with your application at this time. We encourage you to apply for future grant cycles.", "text_align": "center", "font_family": "DM Sans", "font_size": 16}',
    true,
    'lilac'
  );

  -- 4. CTA
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    not_approved_template_id,
    'email_cta',
    3,
    '{"button_text": "BROWSE OTHER GRANTS", "button_url": "{{grants_url}}", "button_color": "wisteria", "text_align": "center"}',
    true,
    'lilac'
  );

  -- 5. Spacer
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    not_approved_template_id,
    'email_spacer',
    4,
    '{"height": 30}',
    true,
    'lilac'
  );

  -- ============================================
  -- GRANT PAYMENT PENDING SECTIONS
  -- ============================================
  DELETE FROM email_sections WHERE email_template_id = payment_pending_template_id;

  -- 1. Hero
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    payment_pending_template_id,
    'email_hero',
    0,
    '{"image_url": "https://nationalfundforwomen.org/images/email-welcome-hero.jpg", "hero_text": "Payment being processed", "text_color": "#FFFFFF", "overlay_position": "center"}',
    true,
    'dove'
  );

  -- 2. Headline
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    payment_pending_template_id,
    'email_text',
    1,
    '{"text": "Payment Processing Underway", "text_align": "center", "font_family": "Playfair Display", "font_size": 28}',
    true,
    'lilac'
  );

  -- 3. Body
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    payment_pending_template_id,
    'email_text',
    2,
    '{"text": "Dear {{name}}, your grant payment for the {{grantCycleName}} grant in the amount of {{amount}} is being processed. You will receive another email once the payment has been sent.", "text_align": "center", "font_family": "DM Sans", "font_size": 16}',
    true,
    'lilac'
  );

  -- 4. CTA
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    payment_pending_template_id,
    'email_cta',
    3,
    '{"button_text": "VIEW APPLICATION STATUS", "button_url": "{{dashboard_url}}", "button_color": "wisteria", "text_align": "center"}',
    true,
    'lilac'
  );

  -- 5. Spacer
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    payment_pending_template_id,
    'email_spacer',
    4,
    '{"height": 30}',
    true,
    'lilac'
  );

  -- ============================================
  -- GRANT PAYMENT SENT SECTIONS
  -- ============================================
  DELETE FROM email_sections WHERE email_template_id = payment_sent_template_id;

  -- 1. Hero
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    payment_sent_template_id,
    'email_hero',
    0,
    '{"image_url": "https://nationalfundforwomen.org/images/email-welcome-hero.jpg", "hero_text": "Payment sent!", "text_color": "#FFFFFF", "overlay_position": "center"}',
    true,
    'dove'
  );

  -- 2. Headline
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    payment_sent_template_id,
    'email_text',
    1,
    '{"text": "Your Payment is on Its Way!", "text_align": "center", "font_family": "Playfair Display", "font_size": 28}',
    true,
    'lilac'
  );

  -- 3. Body
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    payment_sent_template_id,
    'email_text',
    2,
    '{"text": "Dear {{name}}, great news! Your grant payment of {{amount}} for the {{grantCycleName}} grant has been sent. Please allow 1-3 business days for the funds to arrive in your account.", "text_align": "center", "font_family": "DM Sans", "font_size": 16}',
    true,
    'lilac'
  );

  -- 4. CTA
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    payment_sent_template_id,
    'email_cta',
    3,
    '{"button_text": "VIEW YOUR DASHBOARD", "button_url": "{{dashboard_url}}", "button_color": "citrine", "text_align": "center"}',
    true,
    'lilac'
  );

  -- 5. Spacer
  INSERT INTO email_sections (email_template_id, section_type, order_index, content, visible, background_color)
  VALUES (
    payment_sent_template_id,
    'email_spacer',
    4,
    '{"height": 30}',
    true,
    'lilac'
  );

  RAISE NOTICE 'Seeded grant email template sections successfully';
END $$;

NOTIFY pgrst, 'reload';
