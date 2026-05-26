-- Add background_color column to email_sections table
ALTER TABLE email_sections ADD COLUMN background_color TEXT;

-- Add RLS policies for email_sections
ALTER TABLE email_sections ENABLE ROW LEVEL SECURITY;

-- Admin can do anything
CREATE POLICY "Admin full access to email_sections"
  ON email_sections FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload';