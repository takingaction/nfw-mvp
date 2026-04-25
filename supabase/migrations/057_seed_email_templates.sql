-- Seed email_templates table with all email templates
-- 6 Resend templates (editable via /admin/emails)
-- 4 Supabase templates (read-only, configure in Supabase Dashboard)

INSERT INTO email_templates (name, slug, category, description, subject, source_file, is_editable) VALUES
-- Resend Templates
(
  'Welcome Email',
  'welcome',
  'resend',
  'Sent to new members after completing signup. Uses branded template with hero image and membership snapshot.',
  'Welcome to National Fund for Women',
  'lib/email.ts:sendWelcomeEmail',
  true
),
(
  'Newsletter Welcome',
  'newsletter-welcome',
  'resend',
  'Sent when someone subscribes to the newsletter via contact form.',
  'You''re in! Welcome to the NFW community',
  'lib/email.ts:sendNewsletterWelcomeEmail',
  true
),
(
  'Grant Status Update',
  'grant-status',
  'resend',
  'Notifies applicants about their grant application status (in_review, approved, not_approved, payment_pending, payment_sent).',
  'Your Grant Application Update',
  'lib/email.ts:sendGrantStatusEmail',
  true
),
(
  'Bank Info Request',
  'bank-info-request',
  'resend',
  'Sent to request bank information from grant recipients so we can disburse funds.',
  'Action Required: Connect Your Bank Account',
  'lib/email.ts:sendBankInfoRequestEmail',
  true
),
(
  'Gift Codes Email',
  'gift-codes',
  'resend',
  'Sent after purchasing gift memberships with redemption codes.',
  'Your National Fund for Women Gift Codes',
  'lib/email.ts:sendGiftCodesEmail',
  true
),
(
  'Contact Form Auto-Reply',
  'contact-form',
  'resend',
  'Auto-reply sent when someone submits the contact form on the website.',
  'We Received Your Message - National Fund for Women',
  'lib/email.ts:sendContactFormEmail',
  true
),

-- Supabase Templates (read-only - configure in Supabase Dashboard)
(
  'Confirm Signup',
  'supabase-confirm-signup',
  'supabase',
  'Email confirmation link sent after signup. Configure in Supabase Dashboard → Authentication → Email Templates → Confirm signup.',
  'Confirm Your Email',
  'Supabase Dashboard → Authentication → Email Templates',
  false
),
(
  'Reset Password',
  'supabase-reset-password',
  'supabase',
  'Password reset link. Configure in Supabase Dashboard → Authentication → Email Templates → Reset password.',
  'Reset Your Password',
  'Supabase Dashboard → Authentication → Email Templates',
  false
),
(
  'Change Email Address',
  'supabase-change-email',
  'supabase',
  'Email change confirmation request. Configure in Supabase Dashboard → Authentication → Email Templates → Change email.',
  'Confirm Your New Email Address',
  'Supabase Dashboard → Authentication → Email Templates',
  false
),
(
  'Invite User',
  'supabase-invite-user',
  'supabase',
  'Invitation to join the site. Configure in Supabase Dashboard → Authentication → Email Templates → Invite user.',
  'You''ve Been Invited to National Fund for Women',
  'Supabase Dashboard → Authentication → Email Templates',
  false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  source_file = EXCLUDED.source_file,
  is_editable = EXCLUDED.is_editable,
  updated_at = now();

NOTIFY pgrst, 'reload';