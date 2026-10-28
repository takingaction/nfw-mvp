-- Share Your Story v2 (Oct 2026)
-- New prompts: "How has NFW membership surprised you?", program checkboxes,
-- "magic wand" improvement ideas, and an open feedback field.
-- Reused columns: how_nfw_helped ("made a difference"), why_join ("what would you tell someone").
-- Legacy columns drawn_to_membership, favorite_part, programs_engaged are kept for
-- existing submissions and are no longer written by the form.

ALTER TABLE testimonials
  ADD COLUMN IF NOT EXISTS surprised_by TEXT,
  ADD COLUMN IF NOT EXISTS programs_used TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS improvement_ideas TEXT,
  ADD COLUMN IF NOT EXISTS feedback TEXT;

ALTER TABLE testimonials
  DROP CONSTRAINT IF EXISTS testimonials_programs_used_check;
ALTER TABLE testimonials
  ADD CONSTRAINT testimonials_programs_used_check
  CHECK (programs_used <@ ARRAY['microgrants', 'perks', 'zero_dollar_store']::TEXT[]);

NOTIFY pgrst, 'reload';
