-- Add Freshdesk tracking columns to contact_submissions
ALTER TABLE contact_submissions 
ADD COLUMN freshdesk_ticket_id TEXT,
ADD COLUMN freshdesk_status TEXT DEFAULT NULL,  -- 'pending', 'created', 'rejected', 'error'
ADD COLUMN freshdesk_response TEXT;

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_freshdesk_status 
ON contact_submissions(freshdesk_status);

-- Create index for faster date queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at 
ON contact_submissions(created_at DESC);