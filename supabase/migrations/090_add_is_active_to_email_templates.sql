-- Add is_active column to email_templates for enable/disable capability
ALTER TABLE email_templates ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Disable the abandoned-checkout-recovery template by default (enable via admin when ready)
UPDATE email_templates SET is_active = false WHERE slug = 'abandoned-checkout-recovery';

NOTIFY pgrst, 'reload';
