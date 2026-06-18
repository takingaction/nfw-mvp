-- Set grant status update templates to inactive by default
-- Admins can toggle these on in /admin/emails when ready to re-enable

UPDATE email_templates SET is_active = false
WHERE slug IN ('grant-under-review', 'grant-approved', 'grant-not-approved');

NOTIFY pgrst, 'reload';
