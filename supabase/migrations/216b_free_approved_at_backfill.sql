-- Migration 216b: backfill profiles.free_approved_at (run after 216).
--
-- Row locks only, on about 600 approved free members. The match query takes
-- about 4 ms against production; the UPDATE joins on the primary key.
--
-- Side effect: the update_profiles_updated_at trigger bumps updated_at on
-- these rows to now().
--
-- Priority (first match wins):
--   1. waitlist_acceptance_tokens.used_at                    -> 'waitlist_token'
--   2. earliest "Free Membership Request" contact submission -> 'contact_submission'
--   3. joined_at before Jul 1 2026 PT                        -> 'joined_at'
--      joined_at otherwise                                   -> 'joined_at_estimated'

SET lock_timeout = '5s';
SET statement_timeout = '60s';

UPDATE public.profiles p
SET free_approved_at = b.free_approved_at,
    free_approved_at_source = b.free_approved_at_source
FROM (
WITH af AS (
  SELECT id, lower(email) AS email, joined_at
  FROM public.profiles
  WHERE membership_level = 'free'
    AND is_approved_free_member IS TRUE
    AND free_approved_at IS NULL
),
tok AS (
  SELECT t.user_id, min(t.used_at) AS at
  FROM public.waitlist_acceptance_tokens t
  JOIN af ON af.id = t.user_id
  WHERE t.used_at IS NOT NULL
  GROUP BY t.user_id
),
cs AS (
  SELECT user_id, min(created_at) AS at FROM (
    SELECT c.user_id, c.created_at
    FROM public.contact_submissions c JOIN af ON af.id = c.user_id
    WHERE c.subject_label = 'Free Membership Request'
    UNION ALL
    SELECT af.id, c.created_at
    FROM public.contact_submissions c JOIN af ON af.email = lower(c.email)
    WHERE c.subject_label = 'Free Membership Request' AND c.user_id IS NULL
  ) x
  GROUP BY user_id
)
SELECT af.id,
       coalesce(tok.at, cs.at, af.joined_at) AS free_approved_at,
       CASE
         WHEN tok.at IS NOT NULL THEN 'waitlist_token'
         WHEN cs.at IS NOT NULL THEN 'contact_submission'
         WHEN af.joined_at < (timestamp '2026-07-01 00:00' AT TIME ZONE public.site_tz()) THEN 'joined_at'
         ELSE 'joined_at_estimated'
       END AS free_approved_at_source
FROM af
LEFT JOIN tok ON tok.user_id = af.id
LEFT JOIN cs ON cs.user_id = af.id
) b
WHERE p.id = b.id
  AND p.free_approved_at IS NULL;

-- Takes SHARE UPDATE EXCLUSIVE: reads and writes on profiles continue.
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_free_approved_at_source_check;


RESET statement_timeout;
RESET lock_timeout;
