# Member Experience Baseline Analytics: Plan

Status: Phase 1 built (Nov 3, 2026). Migrations 216 and 217 are written but **not yet applied**. Phases 2 and 3 are not started. All dates and month boundaries are in Pacific time (see migration 212).

## Goal

Measure whether members actually use NFW's programs once they join: activation, cross-program use, frequency, retention, communications impact, and evangelism.

## Locked definitions

### Eligible member (the denominator)

Every metric's denominator is the set of eligible members:

- `membership_level IN ('contributing','founding')`, OR `membership_level = 'free' AND is_approved_free_member`
- Excludes `is_admin` and the test accounts `ronpassaro@gmail.com` and `kdrisco2@gmail.com`
- Waitlist and unapproved free profiles are excluded because they cannot use the programs.

### Member start date (when the activation clock starts)

Use the first rule that applies:

1. **Gift members:** `gift_membership_codes.redeemed_at`
2. **Paid members:** `profiles.first_paid_at`
3. **Approved free members:** `profiles.free_approved_at` (migration 216)

`free_approved_at` is set by a trigger whenever `is_approved_free_member` becomes TRUE. It covers every approval path: the contact approve route, waitlist accept, the admin editor, bulk tools and SQL. Historical rows are backfilled:

| Backfill source | Members | Start source |
|---|---|---|
| `waitlist_acceptance_tokens.used_at` | 39 | `free_approved` (exact) |
| `joined_at` for members who joined before Jul 1, 2026 PT | ~500 | `free_joined_at` (treated as exact) |
| Earliest "Free Membership Request" contact submission | ~44 | `free_estimated` (lower bound) |
| `joined_at` for anyone else | ~14 | `free_estimated` |

The ~500 members who joined before Jul 1 count as exact because they joined Apr 23 – Jun 30, before the waitlist existed, and were approved at signup. Of the 242 who engaged, 177 did so within a day of joining (median about 21 minutes).

`start_source` values are `gift`, `paid`, `free_approved`, `free_joined_at`, `free_estimated` and `paid_estimated` (paid with no `first_paid_at`; 4 members). Members whose source is `free_estimated` or `paid_estimated` are left out of activation timing metrics only. They are included everywhere else.

If a member engaged before their start date (for example, a free member who later paid), that engagement counts as day 0.

### Programs and meaningful engagements

Engagements are counted only when the member completed the program's own process. There is no way to know what happens after that.

| Program | Sub-program | Counts when | Source |
|---|---|---|---|
| Microgrants | | Application submitted (`submitted_at` not null) | `grants` |
| Store | | Claim completed (`status IN ('completed','fulfilled')`) | `zero_dollar_claims` |
| Perks | Access Perks | Member went through the redemption flow. Deduped to 1 per user, offer and PT day. | `offer_redemptions` |
| Perks | NFW Perks | Member went through the redemption flow | `nfw_perk_redemptions` |

Access Perks and NFW Perks are reported separately. Program counts (0, 1, 2 or all 3) roll both up into "Perks".

### Content and feedback contributions

All form submissions count, but grant answers do not:

- `testimonials` (the Share Your Story form)
- `contact_submissions`: matched by `user_id`, or by email when `user_id` is null. Broken down by `subject_label`. The **Free Membership Request** subject is excluded, because it is an application made before membership.
- `coming_soon_emails` is pre-launch and not tied to members, so it is excluded.

### Active

A member is active if they have at least one engagement in the window. This is separate from membership or subscription status. Both are shown side by side.

### Grant decisions (for the drop-off analysis)

Outcome: `not_approved` counts as rejected. `approved`, `payment_pending` and `payment_sent` count as approved.

Decision time is the first successful `grant_email_log` decision email, which is when the member found out. If there is none, it falls back to `grant_cycles.final_approved_at`, then `grants.reviewed_at`. Cycles marked `is_testing_only` are excluded everywhere.

## Baseline numbers from the first look (Nov 3, all time)

- About 7,470 eligible members. Programs used: 0 = 41.1%, 1 = 41.6%, 2 = 14.2%, 3 = 3.1%
- Median time from start date to first engagement (members starting May 1 or later): about 24 minutes. Activation is driven by the grant application at signup.
- Microgrant applications: 4,440 of 5,151 were not approved, so rejection is the main drop-off point to test.

## Architecture

Do the computation in Postgres, not in the client. The current `/admin/analytics` page pages about 45k rows into the browser.

1. **`member_engagement_events` (view):** one row per meaningful engagement, with `user_id`, `program`, `sub_program`, `occurred_at`, `occurred_month_pt`, `source_table` and `source_id`.
2. **`member_contributions` (view):** form submissions mapped to members, with a submission-type column.
3. **`member_baseline` (materialized view):** one row per eligible member, with:
   - `start_at`, `start_source`, `membership_level`
   - `first_engagement_at`, `first_program`
   - `program_path`: the ordered list of programs at their first use, e.g. `{microgrants,perks,store}`
   - `programs_used`, `engagement_count`, `last_engagement_at`
   - Grant outcomes: first decision, and whether the member re-engaged after a rejection
   - `contribution_count`
4. **`get_experience_baseline(p_start, p_end, p_cohort_from)` (RPC):** returns all summary metrics as JSON. `SECURITY DEFINER`, admin-checked, `EXECUTE` revoked from `anon` and `authenticated`.
5. **Refresh:** nightly pg_cron job running `REFRESH MATERIALIZED VIEW CONCURRENTLY member_baseline`, plus a manual refresh button in admin.
6. **UI:** a new "Member Experience" tab in `AdminAnalyticsClient.tsx`, with CSV export.

## Phases

### Phase 1: core baseline (all data available now)

1. Migration adding `profiles.free_approved_at`:
   - Set it in `app/api/admin/contact-submissions/approve/route.ts`, `app/api/waitlist/accept/route.ts` and `app/auth/accept-waitlist/page.tsx`.
   - Backfill from `waitlist_acceptance_tokens.used_at` (covers 39 of 597).
   - For the rest, leave the column null and set `start_source = 'free_estimated'`, using `joined_at` as the start date.
2. Migration for the views, the materialized view, the RPC and the cron job.
3. Validation: hand-written SQL checks that reproduce each RPC number.
4. Build the "Member Experience" tab.
5. Fix the existing bug where the Engagement tab leaves grants out of its active-member counts (`AdminAnalyticsClient.tsx`, "skip for now").

The Phase 1 metrics:

- **Activation:**
  - % engaged by day 0, 7, 30, 60 and 90, for cohorts starting May 1, 2026 or later (all three programs live)
  - Median time to first engagement
  - Most common first program
  - Median time to a second program
- **Cross-program:**
  - % of members using 0, 1, 2 or 3 programs
  - Top 10 program pathways
- **Frequency:**
  - % of eligible member-months with at least one engagement
  - Average engagements per member per month
  - Median gap between engagements
- **Retention:**
  - % active in the last 30, 60 and 90 days
  - % who never engaged
  - Survival curve by months since start
  - Re-engagement after a grant rejection vs. after an approval
- **What brings members back:**
  - Repeat Store claims month over month
  - Repeat Access and NFW perk redemptions
  - Grant submissions per member
- **Contributions:** submissions divided by eligible members, by form type

### Phase 2: communications instrumentation

**Resend:**

1. Enable open and click tracking on the sending domain in the Resend dashboard.
2. Subscribe the webhook to `email.opened` and `email.clicked`.
3. Add an append-only `email_events` table with `resend_email_id`, `type`, `occurred_at` and `link`. Don't overwrite `email_sends.status`.
4. Extend `app/api/webhooks/resend/route.ts`.
5. Click rates are the primary signal. Opens are inflated by Apple Mail Privacy Protection.

**Email → activity attribution:** an engagement is attributed to a `template_slug` if it occurs within 7 days of a click on that email. This is a proxy and is labelled as one.

**Flodesk:** the API has no campaign stats or activity endpoints, only subscribers, segments, workflows and webhooks. Two options:

- Monthly CSV import of campaign reports
- UTM-tag all Flodesk links with the `utm_links` builder, then record the UTM on landing, on engagement requests and at signup

**Signup attribution:** record first-touch UTMs at signup on the profile. `signup_source` currently only distinguishes `stripe`, `gift` and `unknown`.

### Phase 3: evangelism

- **Gift-driven acquisition:** `signup_source = 'gift'` (38 so far). Available now and added to Phase 1.
- **Referral:**
  - Preferred: per-member `?ref=` codes stored at signup, which give member-level attribution
  - Alternative: GA4 referral source. It is session-level only and depends on cookie consent, so be careful given the current consent pre-dispute.
- **MAC attribution (Kathleen's calculation):** on hold until the formula is available.

## Phase 1: what was built

| File | What |
|---|---|
| `supabase/migrations/216_free_approved_at.sql` | `profiles.free_approved_at` and `free_approved_at_source` columns, the `trg_profiles_free_approved_at` trigger, and the privileged-column guard (schema only) |
| `supabase/migrations/216b_free_approved_at_backfill.sql` | Backfill of about 600 rows (row locks only), then validates the CHECK constraint |
| `supabase/migrations/217_member_experience_analytics.sql` | Private `analytics` schema (not exposed by PostgREST) with:<br>• views `eligible_members`, `engagement_events`, `contributions`, `grant_decisions`<br>• materialized view `member_baseline`<br>• `public.get_experience_baseline(date)` and `public.refresh_member_baseline()`, both SECURITY DEFINER and service_role only<br>• cron job `refresh-member-baseline` at 10:15 and 11:15 UTC (3:15 AM PT) |
| `app/api/admin/analytics/experience/route.ts` | `GET` returns the metrics. `POST` refreshes the materialized view, then returns the metrics. Both are protected by `requireAdmin()`. |
| `components/admin/MemberExperienceTab.tsx` | The "Experience" tab: Activation, Cross-program, Frequency, Retention, What brings members back, Contributions, Evangelism and start-date sources, with CSV export and a "Refresh now" button |
| `components/admin/AdminAnalyticsClient.tsx` | Adds the "Experience" tab and hides the date range and CSV controls on it (the tab is an all-time baseline). Fixes a bug: the Engagement tab's active-member counts left out microgrant applicants (`Grant` type now has `user_id`). |

### Deploying

1. Run three files separately, in this order: `216_free_approved_at.sql` (schema only), `216b_free_approved_at_backfill.sql` (backfill), then `217`. Do it on staging first, then production.
   - 216 sets a 5-second lock timeout. If it fails with a lock timeout, just run it again.
   - Never put the backfill in the same transaction as the `ALTER TABLE`. The first attempt on Nov 3 did, held an exclusive lock on `profiles`, blocked site reads and timed out (it rolled back cleanly).
2. Migration 217 builds the materialized view with data straight away. Nothing else needs to run first.
3. To verify on production after applying:
   - `SELECT free_approved_at_source, count(*) FROM profiles WHERE membership_level='free' AND is_approved_free_member GROUP BY 1;` should return about 39 / 500 / 44 / 14.
   - `SELECT public.get_experience_baseline();` should match the numbers below within a day's drift.
   - `SELECT * FROM cron.job WHERE jobname='refresh-member-baseline';`

### Validation

The full RPC was run read-only against production on Nov 3, with the views and backfill inlined as CTEs. Cross-checks against independent queries:

- Program counts match: microgrants 3,703, store 754, perks 1,476.
- The 0/1/2/3 split matches: 3,072 / 3,106 / 1,061 / 235 of 7,474.
- `first_paid_at` matches the first succeeded `membership_payments` row for every month bucket.

### Phase 1 results (Nov 3, 2026)

- **Activation** (cohort from May 1, 2026; 7,397 members):
  - Engaged within 24 hours: 43.8%. Within 7 days: 50.3%. Within 30 days: 58.1%. Within 60 days: 59.3%. Within 90 days: 56.8%.
  - Median time to first engagement: about 30 minutes. 75% engaged within 1.3 days.
  - First program: microgrants 75.7%, perks 16.7%, store 7.6%.
  - 1,286 members reached a second program, with a median of 6.9 days.
- **Frequency:**
  - 32.9% of completed member-months had an engagement.
  - 0.51 engagements per member per month.
  - 25.5% of members were active in every completed month.
  - Median gap between engagements: 1.4 days. Mean: 10.3 days.
- **Retention:**
  - Active in the last 30 / 60 / 90 days: 2,206 / 3,707 / 3,963 of 7,474.
  - Never engaged: 3,072.
  - Active in each 30-day period after joining: month 0 = 57.3%, month 1 = 15.8%, month 2 = 13.7%, month 3 = 7.9%.
- **After the first grant decision** (decisions at least 30 days old):

  | Outcome | Members | Re-engaged within 30 days | Re-engaged ever | Applied again |
  |---|---|---|---|---|
  | Rejected | 1,671 | 26.8% | 31.6% | 22.6% |
  | Approved | 108 | 41.7% | 54.6% | 39.8% |

- **Repeat use:** Access Perks 41% repeat, microgrants 25.3%, store 13.5% (claimed in 2+ months), NFW Perks 2.5%.
- **Contributions:** 227 members (3.0%) submitted a form. Only 4 members have submitted a story.

## Open items

- Kathleen's MAC formula
- Contact submissions made before a member's start date: resolved by excluding the Free Membership Request subject. All other submissions count.
