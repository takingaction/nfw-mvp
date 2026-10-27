-- Migration 213: NFW perk expiry = end of the expiry date, Pacific Time.
--
-- The admin date picker used to save new Date("YYYY-MM-DD").toISOString(),
-- i.e. midnight UTC. That made a perk stop working at 4-5 PM PT on the
-- previous day, and US members saw that previous day as the expiry date.
-- The admin form now saves siteEndOfDay(date) (11:59:59.999 PM PT).
--
-- Convert the legacy midnight-UTC values, keeping the date members have
-- been shown (the Pacific date of the old instant) and extending the perk
-- through 11:59:59.999 PM PT on that date. e.g. 2027-01-01 00:00 UTC
-- (shown as "Dec 31") -> 2026-12-31 23:59:59.999 PT.
--
-- Idempotent: only rows still at exactly midnight UTC are touched; new
-- values written by the app are never at midnight UTC.

UPDATE public.nfw_perks
SET expires_at =
  (((expires_at AT TIME ZONE 'America/Los_Angeles')::date + 1)::timestamp
     AT TIME ZONE 'America/Los_Angeles') - interval '1 millisecond'
WHERE expires_at IS NOT NULL
  AND (expires_at AT TIME ZONE 'UTC')::time = '00:00';
