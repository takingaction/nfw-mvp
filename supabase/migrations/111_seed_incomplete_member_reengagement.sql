-- Migration: 111_seed_incomplete_member_reengagement.sql
-- Description: Seed incomplete member reengagement email template
-- Created: 2026-07-10

-- Insert incomplete-member-reengagement email template
-- This template is used to re-engage members who haven't completed their profile

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
  'Incomplete Member Reengagement',
  'incomplete-member-reengagement',
  'resend',
  'Sent to members who have not completed their profile signup',
  'Complete your NFW membership and start saving',
  '<p>Dear {{name}},</p>

<p>You started signing up for NFW but haven''t completed your profile yet. You''re just a few steps away from accessing:</p>

<ul>
<li>Monthly microgrants for women</li>
<li>Everyday discounts at stores you already shop</li>
<li>The Zero Dollar Store with free products</li>
</ul>

<p>Complete your signup today and start saving:</p>

<p><a href="{{signup_url}}">Complete Your Profile</a></p>

<p>If you have any questions, reply to this email and we''ll help you out.</p>

<p>We can''t wait to have you,</p>

<p><strong>The NFW Team</strong></p>',
  true,
  false,
  'lib/email.ts:sendIncompleteMemberEmail',
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