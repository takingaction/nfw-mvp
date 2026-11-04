-- Migration 217: Member Experience Baseline analytics (Phase 1).
--
-- Requires migration 216 (profiles.free_approved_at).
-- Definitions are documented in MEMBER_EXPERIENCE_ANALYTICS.md.
--
-- Everything lives in a private `analytics` schema that PostgREST does not
-- expose. The only entry points are:
--   public.get_experience_baseline(date)    -- metrics as jsonb
--   public.refresh_member_baseline()        -- refresh the materialized view
-- Both are SECURITY DEFINER and executable by service_role only (called from
-- /api/admin/analytics/experience after requireAdmin()).
--
-- Times: stored UTC; months/days are computed in site time (public.site_tz(),
-- Pacific) per migration 212.

CREATE SCHEMA IF NOT EXISTS analytics;
REVOKE ALL ON SCHEMA analytics FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA analytics TO service_role;

-- ── Eligible members + start date ──────────────────────────────────────────
-- Eligible: contributing/founding, or approved free. Excludes admins and the
-- two test accounts.
-- start_at priority: gift redemption > first paid > free approval.
-- timing_exact = FALSE when the start date is a lower bound / estimate; those
-- members are left out of activation timing metrics only.
-- BEGIN VIEW eligible_members
CREATE OR REPLACE VIEW analytics.eligible_members AS
WITH gift AS (
  SELECT redeemed_by_user_id AS user_id, min(redeemed_at) AS redeemed_at
  FROM public.gift_membership_codes
  WHERE redeemed_at IS NOT NULL AND redeemed_by_user_id IS NOT NULL
  GROUP BY redeemed_by_user_id
)
SELECT
  p.id AS user_id,
  p.membership_level,
  p.joined_at,
  s.start_at,
  s.start_source,
  s.start_source IN ('gift', 'paid', 'free_approved', 'free_joined_at') AS timing_exact
FROM public.profiles p
LEFT JOIN gift g ON g.user_id = p.id
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN p.membership_level IN ('contributing', 'founding') AND g.redeemed_at IS NOT NULL THEN g.redeemed_at
      WHEN p.membership_level IN ('contributing', 'founding') AND p.first_paid_at IS NOT NULL THEN p.first_paid_at
      WHEN p.membership_level IN ('contributing', 'founding') THEN p.joined_at
      ELSE coalesce(p.free_approved_at, p.joined_at)
    END AS start_at,
    CASE
      WHEN p.membership_level IN ('contributing', 'founding') AND g.redeemed_at IS NOT NULL THEN 'gift'
      WHEN p.membership_level IN ('contributing', 'founding') AND p.first_paid_at IS NOT NULL THEN 'paid'
      WHEN p.membership_level IN ('contributing', 'founding') THEN 'paid_estimated'
      WHEN p.free_approved_at_source IN ('recorded', 'waitlist_token') THEN 'free_approved'
      WHEN p.free_approved_at_source = 'joined_at' THEN 'free_joined_at'
      ELSE 'free_estimated'
    END AS start_source
) s
WHERE (p.membership_level IN ('contributing', 'founding')
       OR (p.membership_level = 'free' AND p.is_approved_free_member IS TRUE))
  AND p.is_admin IS NOT TRUE
  AND lower(coalesce(p.email, '')) NOT IN ('ronpassaro@gmail.com', 'kdrisco2@gmail.com');
-- END VIEW eligible_members

-- ── Meaningful engagements ─────────────────────────────────────────────────
-- One row per completed program action. Programs: microgrants, store, perks
-- (perks split into access_perks / nfw_perks sub-programs).
-- BEGIN VIEW engagement_events
CREATE OR REPLACE VIEW analytics.engagement_events AS
SELECT g.user_id, 'microgrants'::text AS program, 'microgrants'::text AS sub_program,
       g.submitted_at AS occurred_at, 'grants'::text AS source_table, g.id AS source_id
FROM public.grants g
LEFT JOIN public.grant_cycles c ON c.id = g.cycle_id
WHERE g.submitted_at IS NOT NULL
  AND g.user_id IS NOT NULL
  AND c.is_testing_only IS NOT TRUE
UNION ALL
SELECT z.user_id, 'store', 'store',
       coalesce(z.checkout_completed_at, z.claimed_at), 'zero_dollar_claims', z.id
FROM public.zero_dollar_claims z
WHERE z.status IN ('completed', 'fulfilled')
  AND z.user_id IS NOT NULL
UNION ALL
-- Access Perks: one per member, offer and Pacific day (repeat clicks of the
-- same offer on the same day are one redemption).
SELECT d.user_id, 'perks', 'access_perks', d.occurred_at, 'offer_redemptions', d.id
FROM (
  SELECT DISTINCT ON (o.user_id, o.offer_key, ((coalesce(o.redeemed_at, o.created_at) AT TIME ZONE public.site_tz())::date))
         o.user_id, o.id, coalesce(o.redeemed_at, o.created_at) AS occurred_at
  FROM public.offer_redemptions o
  WHERE o.user_id IS NOT NULL
    AND coalesce(o.redeemed_at, o.created_at) IS NOT NULL
  ORDER BY o.user_id, o.offer_key, ((coalesce(o.redeemed_at, o.created_at) AT TIME ZONE public.site_tz())::date),
           coalesce(o.redeemed_at, o.created_at), o.id
) d
UNION ALL
SELECT n.user_id, 'perks', 'nfw_perks', n.redeemed_at, 'nfw_perk_redemptions', n.id
FROM public.nfw_perk_redemptions n
WHERE n.user_id IS NOT NULL
  AND n.redeemed_at IS NOT NULL;
-- END VIEW engagement_events

-- ── Content / feedback contributions ───────────────────────────────────────
-- All member form submissions except the Free Membership Request form (that
-- is an application, made before membership).
-- BEGIN VIEW contributions
CREATE OR REPLACE VIEW analytics.contributions AS
SELECT t.user_id, 'story'::text AS kind, t.created_at AS occurred_at, t.id AS source_id
FROM public.testimonials t
WHERE t.user_id IS NOT NULL
UNION ALL
SELECT coalesce(cs.user_id, pe.id), 'contact: ' || coalesce(cs.subject_label, 'Other'), cs.created_at, cs.id
FROM public.contact_submissions cs
LEFT JOIN LATERAL (
  SELECT p.id FROM public.profiles p
  WHERE cs.user_id IS NULL AND lower(p.email) = lower(cs.email)
  LIMIT 1
) pe ON TRUE
WHERE coalesce(cs.user_id, pe.id) IS NOT NULL
  AND coalesce(cs.subject_label, '') <> 'Free Membership Request';
-- END VIEW contributions

-- ── Grant decisions ────────────────────────────────────────────────────────
-- decided_at = when the member was told (first successful decision email),
-- falling back to cycle final approval, then reviewed_at.
-- BEGIN VIEW grant_decisions
CREATE OR REPLACE VIEW analytics.grant_decisions AS
SELECT g.id AS grant_id, g.user_id,
       CASE WHEN g.status = 'not_approved' THEN 'rejected' ELSE 'approved' END AS outcome,
       coalesce(e.sent_at, c.final_approved_at, g.reviewed_at) AS decided_at
FROM public.grants g
LEFT JOIN public.grant_cycles c ON c.id = g.cycle_id
LEFT JOIN (
  SELECT l.grant_id, min(l.sent_at) AS sent_at
  FROM public.grant_email_log l
  WHERE l.status = 'sent' AND l.email_type IN ('approved', 'rejected')
  GROUP BY l.grant_id
) e ON e.grant_id = g.id
WHERE g.user_id IS NOT NULL
  AND g.submitted_at IS NOT NULL
  AND c.is_testing_only IS NOT TRUE
  AND g.status IN ('not_approved', 'approved', 'payment_pending', 'payment_sent')
  AND coalesce(e.sent_at, c.final_approved_at, g.reviewed_at) IS NOT NULL;
-- END VIEW grant_decisions

-- ── Per-member baseline (materialized) ─────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS analytics.member_baseline;
-- BEGIN MATVIEW member_baseline
CREATE MATERIALIZED VIEW analytics.member_baseline AS
WITH ev AS (
  SELECT e.* FROM analytics.engagement_events e
  JOIN analytics.eligible_members m ON m.user_id = e.user_id
),
prog_first AS (
  SELECT user_id, program, min(occurred_at) AS first_at
  FROM ev GROUP BY user_id, program
),
prog_ranked AS (
  SELECT user_id, program, first_at,
         row_number() OVER (PARTITION BY user_id ORDER BY first_at, program) AS rn
  FROM prog_first
),
agg AS (
  SELECT user_id,
         count(*) AS engagement_count,
         min(occurred_at) AS first_engagement_at,
         max(occurred_at) AS last_engagement_at,
         bool_or(sub_program = 'access_perks') AS used_access_perks,
         bool_or(sub_program = 'nfw_perks') AS used_nfw_perks
  FROM ev GROUP BY user_id
),
paths AS (
  SELECT user_id,
         count(*) AS programs_used,
         string_agg(program, ' > ' ORDER BY rn) AS program_path,
         max(program) FILTER (WHERE rn = 1) AS first_program,
         max(first_at) FILTER (WHERE rn = 2) AS second_program_at,
         bool_or(program = 'microgrants') AS used_microgrants,
         bool_or(program = 'store') AS used_store,
         bool_or(program = 'perks') AS used_perks
  FROM prog_ranked GROUP BY user_id
),
first_decision AS (
  SELECT DISTINCT ON (user_id) user_id, outcome, decided_at
  FROM analytics.grant_decisions
  ORDER BY user_id, decided_at, grant_id
),
after_decision AS (
  SELECT fd.user_id,
         min(e.occurred_at) AS next_engagement_after_decision,
         min(e.occurred_at) FILTER (WHERE e.program = 'microgrants') AS next_grant_after_decision
  FROM first_decision fd
  JOIN ev e ON e.user_id = fd.user_id AND e.occurred_at > fd.decided_at
  GROUP BY fd.user_id
),
contrib AS (
  SELECT user_id, count(*) AS contribution_count
  FROM analytics.contributions GROUP BY user_id
)
SELECT
  m.user_id,
  m.membership_level,
  m.joined_at,
  m.start_at,
  m.start_source,
  m.timing_exact,
  coalesce(a.engagement_count, 0) AS engagement_count,
  a.first_engagement_at,
  a.last_engagement_at,
  p.first_program,
  p.second_program_at,
  coalesce(p.programs_used, 0) AS programs_used,
  p.program_path,
  coalesce(p.used_microgrants, FALSE) AS used_microgrants,
  coalesce(p.used_store, FALSE) AS used_store,
  coalesce(p.used_perks, FALSE) AS used_perks,
  coalesce(a.used_access_perks, FALSE) AS used_access_perks,
  coalesce(a.used_nfw_perks, FALSE) AS used_nfw_perks,
  -- Engagement before start (e.g. free member who later paid) counts as day 0.
  CASE WHEN a.first_engagement_at IS NOT NULL
       THEN greatest(0, extract(epoch FROM a.first_engagement_at - m.start_at) / 86400.0)
  END AS days_to_first,
  CASE WHEN p.second_program_at IS NOT NULL
       THEN greatest(0, extract(epoch FROM p.second_program_at - m.start_at) / 86400.0)
  END AS days_to_second_program,
  fd.outcome AS first_grant_outcome,
  fd.decided_at AS first_grant_decided_at,
  ad.next_engagement_after_decision,
  ad.next_grant_after_decision,
  coalesce(c.contribution_count, 0) AS contribution_count,
  now() AS refreshed_at
FROM analytics.eligible_members m
LEFT JOIN agg a ON a.user_id = m.user_id
LEFT JOIN paths p ON p.user_id = m.user_id
LEFT JOIN first_decision fd ON fd.user_id = m.user_id
LEFT JOIN after_decision ad ON ad.user_id = m.user_id
LEFT JOIN contrib c ON c.user_id = m.user_id;
-- END MATVIEW member_baseline

CREATE UNIQUE INDEX member_baseline_user_id_idx ON analytics.member_baseline (user_id);

-- ── Refresh ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_member_baseline()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, analytics
SET statement_timeout = '120s'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.member_baseline;
  RETURN now();
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_member_baseline() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_member_baseline() TO service_role;

-- Nightly at 3:15 AM Pacific (10:15 UTC in PDT, 11:15 in PST; both runs are cheap).
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'refresh-member-baseline';
SELECT cron.schedule('refresh-member-baseline', '15 10,11 * * *', 'SELECT public.refresh_member_baseline()');

-- ── Metrics RPC ────────────────────────────────────────────────────────────
-- p_cohort_from: activation cohorts start here (default May 1 2026, the first
-- month all three programs were live). Dates are Pacific.
-- BEGIN FUNCTION get_experience_baseline
CREATE OR REPLACE FUNCTION public.get_experience_baseline(p_cohort_from date DEFAULT DATE '2026-05-01')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, analytics
AS $fn$
WITH
params AS (
  SELECT now() AS as_of,
         (p_cohort_from::timestamp AT TIME ZONE public.site_tz()) AS cohort_from_ts,
         date_trunc('month', now() AT TIME ZONE public.site_tz())::date AS current_month
),
mb AS (SELECT * FROM analytics.member_baseline),
ev AS (
  SELECT e.*, (date_trunc('month', e.occurred_at AT TIME ZONE public.site_tz()))::date AS month
  FROM analytics.engagement_events e
  JOIN mb ON mb.user_id = e.user_id
),
-- ── Activation ──
cohort AS (
  SELECT mb.* FROM mb, params
  WHERE mb.timing_exact AND mb.start_at >= params.cohort_from_ts
),
activation_windows AS (
  SELECT jsonb_agg(jsonb_build_object(
           'days', w.d,
           'eligible', x.eligible,
           'activated', x.activated,
           'pct', round(100.0 * x.activated / nullif(x.eligible, 0), 1)
         ) ORDER BY w.d) AS j
  FROM (VALUES (0), (7), (30), (60), (90)) w(d)
  CROSS JOIN LATERAL (
    -- Only members whose full window has elapsed are in the denominator.
    -- Day 0 = within 24h of start.
    SELECT count(*) AS eligible,
           count(*) FILTER (WHERE c.days_to_first <= greatest(w.d, 1)) AS activated
    FROM cohort c, params
    WHERE c.start_at <= params.as_of - make_interval(days => greatest(w.d, 1))
  ) x
),
activation AS (
  SELECT jsonb_build_object(
    'cohort_from', p_cohort_from,
    'cohort_size', (SELECT count(*) FROM cohort),
    'windows', (SELECT j FROM activation_windows),
    'median_days_to_first', (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY days_to_first)::numeric, 2) FROM cohort WHERE days_to_first IS NOT NULL),
    'p75_days_to_first', (SELECT round(percentile_cont(0.75) WITHIN GROUP (ORDER BY days_to_first)::numeric, 2) FROM cohort WHERE days_to_first IS NOT NULL),
    'median_days_to_second_program', (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY days_to_second_program)::numeric, 2) FROM cohort WHERE days_to_second_program IS NOT NULL),
    'reached_second_program', (SELECT count(*) FROM cohort WHERE second_program_at IS NOT NULL),
    'first_program', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('program', first_program, 'members', n,
               'pct', round(100.0 * n / nullif(total, 0), 1)) ORDER BY n DESC), '[]'::jsonb)
      FROM (SELECT first_program, count(*) AS n, sum(count(*)) OVER () AS total
            FROM cohort WHERE first_program IS NOT NULL GROUP BY first_program) f
    )
  ) AS j
),
-- ── Cross-program ──
cross_program AS (
  SELECT jsonb_build_object(
    'eligible', (SELECT count(*) FROM mb),
    'by_count', (
      SELECT jsonb_agg(jsonb_build_object('programs', k, 'members', n,
               'pct', round(100.0 * n / nullif((SELECT count(*) FROM mb), 0), 1)) ORDER BY k)
      FROM (SELECT k, (SELECT count(*) FROM mb WHERE programs_used = k) AS n FROM generate_series(0, 3) k) t
    ),
    'by_program', jsonb_build_object(
      'microgrants', (SELECT count(*) FROM mb WHERE used_microgrants),
      'store', (SELECT count(*) FROM mb WHERE used_store),
      'perks', (SELECT count(*) FROM mb WHERE used_perks),
      'access_perks', (SELECT count(*) FROM mb WHERE used_access_perks),
      'nfw_perks', (SELECT count(*) FROM mb WHERE used_nfw_perks)
    ),
    'top_paths', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('path', program_path, 'members', n) ORDER BY n DESC, program_path), '[]'::jsonb)
      FROM (SELECT program_path, count(*) AS n FROM mb WHERE program_path IS NOT NULL
            GROUP BY program_path ORDER BY count(*) DESC, program_path LIMIT 10) t
    )
  ) AS j
),
-- ── Frequency ── (completed Pacific months only, from each member's start month)
member_months AS (
  SELECT mb.user_id, gs::date AS month
  FROM mb, params,
       generate_series(date_trunc('month', mb.start_at AT TIME ZONE public.site_tz()),
                       params.current_month - interval '1 month', interval '1 month') gs
),
mm_activity AS (
  SELECT mm.user_id, mm.month, count(ev.source_id) AS events
  FROM member_months mm
  LEFT JOIN ev ON ev.user_id = mm.user_id AND ev.month = mm.month
  GROUP BY mm.user_id, mm.month
),
per_member_months AS (
  SELECT user_id, count(*) AS months, count(*) FILTER (WHERE events > 0) AS active_months
  FROM mm_activity GROUP BY user_id
),
gaps AS (
  SELECT extract(epoch FROM occurred_at - lag(occurred_at) OVER (PARTITION BY user_id ORDER BY occurred_at)) / 86400.0 AS gap_days
  FROM ev
),
frequency AS (
  SELECT jsonb_build_object(
    'member_months', (SELECT count(*) FROM mm_activity),
    'pct_member_months_active', (SELECT round(100.0 * count(*) FILTER (WHERE events > 0) / nullif(count(*), 0), 1) FROM mm_activity),
    'avg_engagements_per_member_month', (SELECT round(avg(events)::numeric, 2) FROM mm_activity),
    'members_with_completed_month', (SELECT count(*) FROM per_member_months),
    'pct_members_active_every_month', (SELECT round(100.0 * count(*) FILTER (WHERE active_months = months) / nullif(count(*), 0), 1) FROM per_member_months),
    'median_days_between_engagements', (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY gap_days)::numeric, 1) FROM gaps WHERE gap_days IS NOT NULL),
    'avg_days_between_engagements', (SELECT round(avg(gap_days)::numeric, 1) FROM gaps WHERE gap_days IS NOT NULL),
    'monthly', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('month', month, 'members', members, 'active', active,
               'pct_active', round(100.0 * active / nullif(members, 0), 1),
               'avg_engagements', round(events::numeric / nullif(members, 0), 2)) ORDER BY month), '[]'::jsonb)
      FROM (SELECT month, count(*) AS members, count(*) FILTER (WHERE events > 0) AS active, sum(events) AS events
            FROM mm_activity GROUP BY month) t
    )
  ) AS j
),
-- ── Retention ──
active_k AS (
  -- Month k = days [30k, 30k+30) after start.
  SELECT DISTINCT ev.user_id,
         floor(extract(epoch FROM ev.occurred_at - mb.start_at) / (86400.0 * 30))::int AS k
  FROM ev JOIN mb ON mb.user_id = ev.user_id
  WHERE ev.occurred_at >= mb.start_at
),
survival AS (
  -- Denominator = members whose whole month-k window has elapsed.
  SELECT coalesce(jsonb_agg(jsonb_build_object('month', k, 'members', members, 'active', active,
           'pct', round(100.0 * active / nullif(members, 0), 1)) ORDER BY k), '[]'::jsonb) AS j
  FROM (
    SELECT g.k,
           count(*) AS members,
           count(ak.user_id) AS active
    FROM generate_series(0, 12) g(k)
    CROSS JOIN params
    JOIN mb ON mb.start_at + make_interval(days => 30 * g.k + 30) <= params.as_of
    LEFT JOIN active_k ak ON ak.user_id = mb.user_id AND ak.k = g.k
    GROUP BY g.k
  ) t
),
last_ev AS (
  SELECT DISTINCT ON (user_id) user_id, program
  FROM ev ORDER BY user_id, occurred_at DESC, source_id
),
retention AS (
  SELECT jsonb_build_object(
    'active_30', (SELECT count(*) FROM mb, params WHERE last_engagement_at >= params.as_of - interval '30 days'),
    'active_60', (SELECT count(*) FROM mb, params WHERE last_engagement_at >= params.as_of - interval '60 days'),
    'active_90', (SELECT count(*) FROM mb, params WHERE last_engagement_at >= params.as_of - interval '90 days'),
    'never_engaged', (SELECT count(*) FROM mb WHERE engagement_count = 0),
    'eligible', (SELECT count(*) FROM mb),
    'survival', (SELECT j FROM survival),
    -- Lapsed = engaged before but nothing in the last 60 days: which program did they last use?
    'lapsed_last_program', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('program', program, 'members', n) ORDER BY n DESC), '[]'::jsonb)
      FROM (
        SELECT l.program, count(*) AS n
        FROM mb
        CROSS JOIN params
        JOIN last_ev l ON l.user_id = mb.user_id
        WHERE mb.engagement_count > 0 AND mb.last_engagement_at < params.as_of - interval '60 days'
        GROUP BY l.program
      ) t
    ),
    -- First microgrant decision, decisions at least 30 days old.
    'after_first_grant_decision', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'outcome', first_grant_outcome,
               'members', n,
               'reengaged_30d', r30,
               'pct_reengaged_30d', round(100.0 * r30 / nullif(n, 0), 1),
               'reengaged_ever', rev,
               'pct_reengaged_ever', round(100.0 * rev / nullif(n, 0), 1),
               'applied_again', ag,
               'pct_applied_again', round(100.0 * ag / nullif(n, 0), 1)) ORDER BY first_grant_outcome), '[]'::jsonb)
      FROM (
        SELECT first_grant_outcome,
               count(*) AS n,
               count(*) FILTER (WHERE next_engagement_after_decision < first_grant_decided_at + interval '30 days') AS r30,
               count(*) FILTER (WHERE next_engagement_after_decision IS NOT NULL) AS rev,
               count(*) FILTER (WHERE next_grant_after_decision IS NOT NULL) AS ag
        FROM mb, params
        WHERE first_grant_outcome IS NOT NULL
          AND first_grant_decided_at <= params.as_of - interval '30 days'
        GROUP BY first_grant_outcome
      ) t
    )
  ) AS j
),
-- ── What brings members back ──
repeat AS (
  SELECT jsonb_build_object(
    'store', (SELECT jsonb_build_object('members', count(*),
                'repeat_members', count(*) FILTER (WHERE months >= 2),
                'pct_repeat', round(100.0 * count(*) FILTER (WHERE months >= 2) / nullif(count(*), 0), 1),
                'avg_months_claimed', round(avg(months)::numeric, 2))
              FROM (SELECT user_id, count(DISTINCT month) AS months FROM ev WHERE program = 'store' GROUP BY user_id) t),
    'access_perks', (SELECT jsonb_build_object('members', count(*),
                'repeat_members', count(*) FILTER (WHERE n >= 2),
                'pct_repeat', round(100.0 * count(*) FILTER (WHERE n >= 2) / nullif(count(*), 0), 1),
                'avg_redemptions', round(avg(n)::numeric, 2))
              FROM (SELECT user_id, count(*) AS n FROM ev WHERE sub_program = 'access_perks' GROUP BY user_id) t),
    'nfw_perks', (SELECT jsonb_build_object('members', count(*),
                'repeat_members', count(*) FILTER (WHERE n >= 2),
                'pct_repeat', round(100.0 * count(*) FILTER (WHERE n >= 2) / nullif(count(*), 0), 1),
                'avg_redemptions', round(avg(n)::numeric, 2))
              FROM (SELECT user_id, count(*) AS n FROM ev WHERE sub_program = 'nfw_perks' GROUP BY user_id) t),
    'microgrants', (SELECT jsonb_build_object('members', count(*),
                'repeat_members', count(*) FILTER (WHERE n >= 2),
                'pct_repeat', round(100.0 * count(*) FILTER (WHERE n >= 2) / nullif(count(*), 0), 1),
                'avg_submissions', round(avg(n)::numeric, 2))
              FROM (SELECT user_id, count(*) AS n FROM ev WHERE program = 'microgrants' GROUP BY user_id) t)
  ) AS j
),
-- ── Contributions + evangelism ──
contributions AS (
  SELECT jsonb_build_object(
    'contributors', (SELECT count(*) FROM mb WHERE contribution_count > 0),
    'pct_contributors', (SELECT round(100.0 * count(*) FILTER (WHERE contribution_count > 0) / nullif(count(*), 0), 1) FROM mb),
    'submissions', (SELECT coalesce(sum(contribution_count), 0) FROM mb),
    'by_kind', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'submissions', n, 'members', u) ORDER BY n DESC), '[]'::jsonb)
      FROM (SELECT c.kind, count(*) AS n, count(DISTINCT c.user_id) AS u
            FROM analytics.contributions c JOIN mb ON mb.user_id = c.user_id GROUP BY c.kind) t
    )
  ) AS j
),
evangelism AS (
  SELECT jsonb_build_object(
    'gift_members', (SELECT count(*) FROM mb WHERE start_source = 'gift'),
    'pct_gift_members', (SELECT round(100.0 * count(*) FILTER (WHERE start_source = 'gift') / nullif(count(*), 0), 2) FROM mb)
  ) AS j
),
meta AS (
  SELECT jsonb_build_object(
    'generated_at', (SELECT as_of FROM params),
    'refreshed_at', (SELECT max(refreshed_at) FROM mb),
    'start_sources', (SELECT jsonb_object_agg(start_source, n) FROM (SELECT start_source, count(*) AS n FROM mb GROUP BY start_source) t)
  ) AS j
)
SELECT jsonb_build_object(
  'meta', (SELECT j FROM meta),
  'activation', (SELECT j FROM activation),
  'cross_program', (SELECT j FROM cross_program),
  'frequency', (SELECT j FROM frequency),
  'retention', (SELECT j FROM retention),
  'repeat', (SELECT j FROM repeat),
  'contributions', (SELECT j FROM contributions),
  'evangelism', (SELECT j FROM evangelism)
);
$fn$;
-- END FUNCTION get_experience_baseline

REVOKE ALL ON FUNCTION public.get_experience_baseline(date) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_experience_baseline(date) TO service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO service_role;

NOTIFY pgrst, 'reload';
