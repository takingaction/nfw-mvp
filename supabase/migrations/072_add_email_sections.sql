-- Email Sections Table
-- Stores individual sections/blocks for email templates (similar to page_sections)

CREATE TABLE email_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE NOT NULL,
  section_type TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  content JSONB DEFAULT '{}',
  visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_sections_template ON email_sections(email_template_id);
CREATE INDEX idx_email_sections_order ON email_sections(email_template_id, order_index);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_email_section_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_sections_updated_at
  BEFORE UPDATE ON email_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_email_section_timestamp();