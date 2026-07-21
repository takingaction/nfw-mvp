-- Rename "Welcome Email - Free" to "Waitlist Approval"
UPDATE email_templates
SET name = 'Waitlist Approval'
WHERE slug = 'welcome-free';

NOTIFY pgrst, 'reload';
