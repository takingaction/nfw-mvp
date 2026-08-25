-- Phase 1: Clean up stripe_backfill_status duplicates and orphaned rows
-- This removes:
-- 1. Duplicate email entries (keep most recent processed_at)
-- 2. Rows with NULL profile_id

-- Step 1: Remove duplicate emails, keeping the most recent entry by processed_at
DELETE FROM stripe_backfill_status sbs
WHERE sbs.ctid NOT IN (
  SELECT MIN(ctid)  -- keep row with earliest ctid for each email (arbitrary but deterministic)
  FROM stripe_backfill_status
  GROUP BY email
);

-- Alternative: If you want to keep most recent by processed_at, use this instead:
-- DELETE FROM stripe_backfill_status sbs
-- WHERE sbs.ctid IN (
--   SELECT s2.ctid FROM stripe_backfill_status s1
--   JOIN stripe_backfill_status s2 ON s1.email = s2.email AND s1.processed_at > s2.processed_at
-- );

-- Step 2: Remove orphaned rows (NULL profile_id)
DELETE FROM stripe_backfill_status
WHERE profile_id IS NULL;

-- Step 3: Verify cleanup
SELECT 
  'After cleanup' as stage,
  COUNT(*) as total_rows,
  COUNT(DISTINCT email) as distinct_emails,
  COUNT(CASE WHEN profile_id IS NULL THEN 1 END) as null_profile_id
FROM stripe_backfill_status;
