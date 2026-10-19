-- Rollback for 208_email_sends.sql

ALTER TABLE waitlist_acceptance_tokens DROP COLUMN IF EXISTS email_send_id;
DROP TABLE IF EXISTS email_sends;

NOTIFY pgrst, 'reload';
