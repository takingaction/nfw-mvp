-- Migration: 041_add_claim_month_and_expire_abandoned.sql
-- Description: Add claim_month tracking column and create cleanup for abandoned checkouts
-- Created: 2026-04-20

-- Add claim_month column to zero_dollar_claims for easier tracking
ALTER TABLE zero_dollar_claims
ADD COLUMN IF NOT EXISTS claim_month DATE;

CREATE INDEX IF NOT EXISTS idx_zero_dollar_claims_claim_month
    ON zero_dollar_claims(claim_month);

COMMENT ON COLUMN zero_dollar_claims.claim_month IS 'Month the claim was made (first day of month) - for tracking and cleanup';

-- Add index for status to help with cleanup queries
CREATE INDEX IF NOT EXISTS idx_zero_dollar_claims_status
    ON zero_dollar_claims(status);

-- Function to mark old abandoned checkouts as expired
CREATE OR REPLACE FUNCTION expire_abandoned_claims(days_old INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE zero_dollar_claims
    SET status = 'expired'
    WHERE status = 'created'
    AND claimed_at < NOW() - (days_old || ' days')::INTERVAL;

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_abandoned_claims IS 'Marks abandoned claims (status=created, older than X days) as expired. Returns count of expired claims.';

-- Function to cleanup expired claims from monthly_claims table
CREATE OR REPLACE FUNCTION cleanup_monthly_claims_for_expired()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete monthly_claims that are tied to now-expired claims
    DELETE FROM monthly_claims mc
    WHERE EXISTS (
        SELECT 1 FROM zero_dollar_claims zdc
        WHERE zdc.user_id = mc.user_id
        AND zdc.claim_month = mc.claim_month
        AND zdc.status = 'expired'
    );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_monthly_claims_for_expired IS 'Removes monthly_claims entries for claims that have been marked as expired';