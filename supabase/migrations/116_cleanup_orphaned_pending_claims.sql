-- Migration: 116_cleanup_orphaned_pending_claims.sql
-- Purpose: Add pg_cron job to clean up orphaned pending_monthly_claims
-- Orphans can occur if:
-- 1. Checkout API inserted pending_monthly_claims but failed before creating zero_dollar_claims
-- 2. Shopify webhook never fired (delivery failed) and checkout was abandoned

BEGIN;

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_orphaned_pending_claims()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Delete pending_monthly_claims older than 30 minutes that have no corresponding
  -- active zero_dollar_claims (status = 'created')
  DELETE FROM pending_monthly_claims p
  WHERE p.created_at < (NOW() - INTERVAL '30 minutes')
  AND NOT EXISTS (
    SELECT 1 FROM zero_dollar_claims z
    WHERE z.user_id = p.user_id
    AND z.claim_month = p.claim_month
    AND z.status = 'created'
  );
END;
$$;

-- Schedule cron job to run every 30 minutes
SELECT cron.schedule(
  'cleanup-orphaned-pending-claims',
  '*/30 * * * *',
  'SELECT cleanup_orphaned_pending_claims()'
);

COMMIT;
