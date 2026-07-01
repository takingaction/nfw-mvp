-- Add addressed column to contact_submissions
ALTER TABLE contact_submissions ADD COLUMN addressed BOOLEAN DEFAULT FALSE;
