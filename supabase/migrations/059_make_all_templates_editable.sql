-- Make all email templates editable (including Supabase)
UPDATE email_templates SET is_editable = true;
NOTIFY pgrst, 'reload';