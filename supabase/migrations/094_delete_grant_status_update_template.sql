-- Delete orphaned "Grant Status Update" template (unified template, replaced by individual status templates)
DELETE FROM email_templates WHERE slug = 'grant-status-update';

NOTIFY pgrst, 'reload';
