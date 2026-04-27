-- Seed grant email templates for NFW MVP
-- Run this in Supabase SQL Editor

INSERT INTO email_templates (name, slug, category, description, subject, source_file, is_editable, updated_at)
VALUES
  ('Grant Application Received', 'grant-application-received', 'resend', 'Auto-sent when a grant application is submitted', 'Your application has been received!', 'lib/email.ts:sendGrantApplicationReceivedEmail', true, NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  source_file = EXCLUDED.source_file,
  updated_at = NOW();

INSERT INTO email_templates (name, slug, category, description, subject, source_file, is_editable, updated_at)
VALUES
  ('Grant: Under Review', 'grant-under-review', 'resend', 'Sent when admin changes status to in_review', 'Your NFW grant application is being reviewed', 'lib/email.ts:sendGrantStatusEmail', true, NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  source_file = EXCLUDED.source_file,
  updated_at = NOW();

INSERT INTO email_templates (name, slug, category, description, subject, source_file, is_editable, updated_at)
VALUES
  ('Grant: Approved', 'grant-approved', 'resend', 'Sent when admin approves a grant application', 'Your NFW grant application has been approved!', 'lib/email.ts:sendGrantStatusEmail', true, NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  source_file = EXCLUDED.source_file,
  updated_at = NOW();

INSERT INTO email_templates (name, slug, category, description, subject, source_file, is_editable, updated_at)
VALUES
  ('Grant: Not Approved', 'grant-not-approved', 'resend', 'Sent when admin marks a grant application as not approved', 'Update on your NFW grant application', 'lib/email.ts:sendGrantStatusEmail', true, NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  source_file = EXCLUDED.source_file,
  updated_at = NOW();

INSERT INTO email_templates (name, slug, category, description, subject, source_file, is_editable, updated_at)
VALUES
  ('Grant: Payment Pending', 'grant-payment-pending', 'resend', 'Sent when admin changes status to payment_pending', 'Your NFW grant payment is being processed', 'lib/email.ts:sendGrantStatusEmail', true, NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  source_file = EXCLUDED.source_file,
  updated_at = NOW();

INSERT INTO email_templates (name, slug, category, description, subject, source_file, is_editable, updated_at)
VALUES
  ('Grant: Payment Sent', 'grant-payment-sent', 'resend', 'Sent when admin changes status to payment_sent', 'Your NFW grant payment has been sent!', 'lib/email.ts:sendGrantStatusEmail', true, NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  source_file = EXCLUDED.source_file,
  updated_at = NOW();

-- Also update bank-info-request to mark it as grant-related (it's already seeded, this just ensures consistency)
INSERT INTO email_templates (name, slug, category, description, subject, source_file, is_editable, updated_at)
VALUES
  ('Bank Info Request', 'bank-info-request', 'resend', 'Sent to request bank information from grant recipients', 'Action Required: Connect Your Bank Account', 'lib/email.ts:sendBankInfoRequestEmail', true, NOW())
ON CONFLICT (slug) DO UPDATE SET
  updated_at = NOW();

-- Verify
SELECT slug, name, category FROM email_templates WHERE category = 'resend' ORDER BY name;