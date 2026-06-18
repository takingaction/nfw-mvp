-- Create function and cron job for sending abandoned checkout recovery emails
CREATE OR REPLACE FUNCTION send_abandoned_checkout_emails()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  abandoned_record RECORD;
  template_record RECORD;
  profile_record RECORD;
  auth_user_record RECORD;
  email_sent_count INT := 0;
BEGIN
  -- Check if template is active
  SELECT * INTO template_record
  FROM email_templates
  WHERE slug = 'abandoned-checkout-recovery' AND is_active = true;

  IF NOT FOUND THEN
    RAISE NOTICE 'Abandoned checkout email template is not active, skipping';
    RETURN;
  END IF;

  -- Find abandoned checkouts that need first email (24h after abandonment)
  FOR abandoned_record IN
    SELECT ac.*, p.full_name, au.email as user_email
    FROM abandoned_checkouts ac
    JOIN profiles p ON p.id = ac.user_id
    JOIN auth.users au ON au.id = ac.user_id
    WHERE ac.recovered_at IS NULL
      AND ac.email_sent_at IS NULL
      AND ac.email_retry_at <= NOW()
    LIMIT 10
  LOOP
    -- Send the email
    BEGIN
      PERFORM send_email(
        abandoned_record.user_email,
        template_record.subject,
        replace(replace(template_record.html_content,
          '{{name}}', COALESCE(abandoned_record.full_name, 'there')),
          '{{ctaUrl}}', COALESCE(abandoned_record.checkout_url, 'https://nationalfundforwomen.org/checkout/resume'))
      );

      -- Update record to mark email sent and set retry time for 3 days later
      UPDATE abandoned_checkouts
      SET email_sent_at = NOW(),
          email_retry_at = NOW() + INTERVAL '3 days'
      WHERE id = abandoned_record.id;

      email_sent_count := email_sent_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send abandoned checkout email to %: %', abandoned_record.user_email, SQLERRM;
    END;
  END LOOP;

  -- Find abandoned checkouts that need retry email (3 days after first send)
  FOR abandoned_record IN
    SELECT ac.*, p.full_name, au.email as user_email
    FROM abandoned_checkouts ac
    JOIN profiles p ON p.id = ac.user_id
    JOIN auth.users au ON au.id = ac.user_id
    WHERE ac.recovered_at IS NULL
      AND ac.email_sent_at IS NOT NULL
      AND ac.email_retry_at <= NOW()
      AND ac.email_sent_at < NOW() - INTERVAL '1 day'  -- At least 1 day since first email
    LIMIT 10
  LOOP
    BEGIN
      PERFORM send_email(
        abandoned_record.user_email,
        'Reminder: Complete your NFW membership',
        replace(replace(template_record.html_content,
          '{{name}}', COALESCE(abandoned_record.full_name, 'there')),
          '{{ctaUrl}}', COALESCE(abandoned_record.checkout_url, 'https://nationalfundforwomen.org/checkout/resume'))
      );

      -- Update record - set retry_at to NULL so no more retries
      UPDATE abandoned_checkouts
      SET email_retry_at = NULL
      WHERE id = abandoned_record.id;

      email_sent_count := email_sent_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send abandoned checkout retry email to %: %', abandoned_record.user_email, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Sent % abandoned checkout emails', email_sent_count;
END;
$$;

-- Cron job to run every hour
SELECT cron.schedule(
  'send-abandoned-checkout-emails',
  '0 * * * *',
  'SELECT send_abandoned_checkout_emails()'
);
