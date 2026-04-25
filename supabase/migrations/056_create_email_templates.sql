-- Create email_templates table for admin email management
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('resend', 'supabase')),
  description TEXT,
  subject TEXT,
  html_content TEXT,
  is_editable BOOLEAN DEFAULT true,
  source_file TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_email_templates_slug ON email_templates(slug);
CREATE INDEX idx_email_templates_category ON email_templates(category);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Admin access policies
CREATE POLICY "Admin read all templates" ON email_templates FOR SELECT USING (true);
CREATE POLICY "Admin update templates" ON email_templates FOR UPDATE USING (true);
CREATE POLICY "Admin insert templates" ON email_templates FOR INSERT WITH CHECK (true);

-- Notify PostgREST of changes
NOTIFY pgrst, 'reload';
