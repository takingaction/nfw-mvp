-- Add certification_consent column to grants table
-- This tracks the new checkbox: "I certify that the information provided is accurate..."

ALTER TABLE grants ADD COLUMN certification_consent BOOLEAN DEFAULT FALSE;

-- Add index for tracking
CREATE INDEX IF NOT EXISTS idx_grants_certification_consent ON grants(certification_consent);

NOTIFY pgrst, 'reload';
