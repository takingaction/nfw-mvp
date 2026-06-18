-- Delete orphaned "Grant Status Update" template (unified template, replaced by individual status templates)
DELETE FROM email_templates WHERE slug = 'grant-status';

-- Delete "Grant: Under Review" template (internal-only status, no email needed)
DELETE FROM email_templates WHERE slug = 'grant-under-review';

NOTIFY pgrst, 'reload';
