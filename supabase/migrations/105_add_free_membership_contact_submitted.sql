-- Add free_membership_contact_submitted column to track contact form submission
ALTER TABLE profiles ADD COLUMN free_membership_contact_submitted BOOLEAN DEFAULT NULL;

-- NULL = not in free membership flow
-- FALSE = started free request but hasn't submitted contact form
-- TRUE = contact form submitted, awaiting admin approval

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_profiles_free_membership_contact_submitted ON profiles(free_membership_contact_submitted) WHERE free_membership_contact_submitted IS NOT NULL;

NOTIFY pgrst, 'reload';
