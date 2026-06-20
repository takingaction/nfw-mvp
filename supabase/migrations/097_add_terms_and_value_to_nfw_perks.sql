-- Migration: 097_add_terms_and_value_to_nfw_perks
-- Add terms_and_conditions and estimated_value columns to nfw_perks table

-- Add columns as nullable first
ALTER TABLE nfw_perks ADD COLUMN terms_and_conditions TEXT;
ALTER TABLE nfw_perks ADD COLUMN estimated_value NUMERIC(10,2);

-- Update existing rows to have default value (0) for estimated_value
UPDATE nfw_perks SET estimated_value = 0 WHERE estimated_value IS NULL;

-- Now add NOT NULL constraint (column has no NULLs after UPDATE)
ALTER TABLE nfw_perks ALTER COLUMN estimated_value SET NOT NULL;
ALTER TABLE nfw_perks ALTER COLUMN estimated_value SET DEFAULT 0;

-- Add comments
COMMENT ON COLUMN nfw_perks.terms_and_conditions IS 'Terms and conditions for the perk offer';
COMMENT ON COLUMN nfw_perks.estimated_value IS 'Estimated monetary value of the perk for dashboard calculations';

-- Refresh schema cache
NOTIFY pgrst, 'reload';
