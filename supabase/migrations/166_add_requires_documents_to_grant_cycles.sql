-- Add requires_documents flag to grant_cycles table
ALTER TABLE grant_cycles ADD COLUMN IF NOT EXISTS requires_documents BOOLEAN DEFAULT FALSE;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
