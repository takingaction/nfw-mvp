-- Add hero_image_url column to email_templates table
ALTER TABLE email_templates ADD COLUMN hero_image_url TEXT;

NOTIFY pgrst, 'reload';