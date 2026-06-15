-- Add unique index to prevent duplicate monthly claims per user
-- This enforces at the database level that a user can only have one claim per month
-- Uses claim_month text column (format: "YYYY-MM-01") to match the application query
-- Note: Without CONCURRENTLY this will briefly lock the table, but monthly_claims is small so it's fast

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_claims_user_month
ON monthly_claims(user_id, claim_month);

NOTIFY pgrst, 'reload';