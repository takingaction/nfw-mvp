-- Add columns to email_templates for email builder

ALTER TABLE email_templates
ADD COLUMN full_email_html TEXT,
ADD COLUMN preview_data JSONB DEFAULT '{"name": "Preview User", "email": "preview@example.com"}',
ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published'));

-- Add index for status queries
CREATE INDEX idx_email_templates_status ON email_templates(status);

-- Note: Existing templates will have status='draft' and empty full_email_html
-- They will need to be converted and republished to work with the builder