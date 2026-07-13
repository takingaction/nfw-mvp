-- Migration: 117_drop_monthly_claims.sql
-- Purpose: Drop unused monthly_claims table (replaced by pending_monthly_claims)

BEGIN;

DROP TABLE IF EXISTS monthly_claims;
NOTIFY pgrst, 'reload';

COMMIT;
