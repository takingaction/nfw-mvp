-- Add user_id column to contact_submissions for proper profile linkage
ALTER TABLE contact_submissions ADD COLUMN user_id UUID REFERENCES profiles(id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON contact_submissions(user_id);

-- Backfill existing submissions: try to match by email
UPDATE contact_submissions cs
SET user_id = p.id
FROM profiles p
WHERE p.email = cs.email
  AND cs.user_id IS NULL;
