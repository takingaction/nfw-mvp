-- Migration: 109_seed_waitlist_welcome_email.sql
-- Description: Seed waitlist welcome email template
-- Created: 2026-07-08

-- Insert waitlist-welcome email template
-- This template is used when users join the free membership waitlist

INSERT INTO email_templates (
  name,
  slug,
  category,
  description,
  subject,
  html_content,
  is_editable,
  is_active,
  source_file,
  updated_at
) VALUES (
  'Waitlist Welcome',
  'waitlist-welcome',
  'resend',
  'Sent to users when they join the free membership waitlist',
  'An update on your NFW membership application',
  '<p>Dear {{name}},</p>

<p>Thank you for applying for NFW''s free membership! Due to an overwhelming number of applications, we''ve added you to the waitlist.</p>

<p>Our waitlist functions on a first come, first serve basis. There are currently {{waitlistCount}} in the queue.</p>

<p>Don''t want to wait? <a href="{{ctaUrl}}">Become a Contributing Member</a> for just $1.25/month (billed annually at $15) to instantly unlock the entire NFW ecosystem, including monthly microgrants, discounts you can use everyday, and the Zero Dollar Store. Our members can save hundreds – sometimes thousands – of dollars a year.</p>

<p>Otherwise, as soon as a spot opens up, we''ll activate your membership and send you a welcome email.</p>

<p>We can''t wait to have you,</p>

<p><strong>The NFW Team</strong></p>',
  true,
  true,
  'lib/email-batch.ts:sendWaitlistWelcomeEmailBatch',
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  is_editable = EXCLUDED.is_editable,
  is_active = EXCLUDED.is_active,
  source_file = EXCLUDED.source_file,
  updated_at = NOW();

NOTIFY pgrst, 'reload';
