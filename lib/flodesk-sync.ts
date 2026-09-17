/**
 * Flodesk sync engine.
 *
 * runFlodeskSync()        — full pass over all enabled rules (cron + admin "Run now")
 * resyncProfileNow()      — evaluate one profile against all enabled rules (hooks)
 * removeProfileFromFlodesk() — exit every segment (+ optional unsubscribe) for anonymization
 *
 * Ordering inside a run: EXITS for all rules first, then ADDITIONS. After a
 * completed run a member is therefore in at most one category segment.
 *
 * Idempotency lives in flodesk_sync_members (PK rule_id+profile_id):
 *   added   → in segment; exits check whether they still belong
 *   removed → was in segment, left; may be re-added later
 *   failed  → retried each run until MAX_ATTEMPTS
 *
 * Throttling (Flodesk limits: 100 req/min general, 20 req/min batch):
 *   batch upsert  → 3.2s between calls
 *   single remove → 0.65s between calls
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import getAdminClient from "@/lib/supabase/admin";
import {
  FLODESK_BATCH_SIZE,
  batchUpsertSubscribers,
  isFlodeskConfigured,
  removeFromSegments,
  splitName,
  unsubscribeSubscriber,
  type FlodeskUpsertItem,
} from "@/lib/flodesk";
import {
  fetchAllSyncProfiles,
  fetchRules,
  fetchSyncProfile,
  isEligibleForAdd,
  isStillEligible,
  type SyncProfile,
} from "@/lib/flodesk-rules";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncMemberRow {
  rule_id: string;
  profile_id: string;
  status: "added" | "removed" | "failed";
  flodesk_subscriber_id: string | null;
  attempt_count: number;
  last_error: string | null;
  added_at: string | null;
  removed_at: string | null;
  updated_at: string;
}

export interface RuleRunResult {
  ruleId: string;
  key: string;
  name: string;
  category: string;
  added: number;
  removed: number;
  failed: number;
  /** Eligible-but-not-yet-processed after this run (budget/rate-limit). */
  remaining: number;
  /** Dry-run only: sample of emails that would be added / removed. */
  sampleAdd?: string[];
  sampleRemove?: string[];
}

export interface RunSummary {
  ok: boolean;
  skipped?: "not_configured" | "no_rules";
  dryRun: boolean;
  startedAt: string;
  durationMs: number;
  budgetExhausted: boolean;
  rateLimited: boolean;
  rules: RuleRunResult[];
  error?: string;
}

export interface RunOptions {
  /** Restrict to one rule. When set, the rule runs even if disabled (admin intent). */
  ruleId?: string;
  /** Compute what would happen without calling Flodesk or writing state. */
  dryRun?: boolean;
  /** Wall-clock budget; default leaves headroom under Vercel's 300s maxDuration. */
  timeBudgetMs?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;
const BATCH_DELAY_MS = 3_200;
const REMOVE_DELAY_MS = 650;
const DEFAULT_BUDGET_MS = 250_000;
const PAGE_SIZE = 1000;
const SAMPLE_SIZE = 10;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

async function fetchMemberRows(admin: SupabaseClient, ruleIds: string[]): Promise<SyncMemberRow[]> {
  if (ruleIds.length === 0) return [];
  const all: SyncMemberRow[] = [];
  let page = 0;
  for (;;) {
    const from = page * PAGE_SIZE;
    const { data, error } = await admin
      .from("flodesk_sync_members")
      .select("*")
      .in("rule_id", ruleIds)
      .order("profile_id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[flodesk-sync] fetchMemberRows error:", error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...(data as SyncMemberRow[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return all;
}

const memberKey = (ruleId: string, profileId: string) => `${ruleId}:${profileId}`;

async function upsertMemberRows(admin: SupabaseClient, rows: Partial<SyncMemberRow>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await admin
    .from("flodesk_sync_members")
    .upsert(rows, { onConflict: "rule_id,profile_id" });
  if (error) console.error("[flodesk-sync] upsertMemberRows error:", error);
}

function toUpsertItem(profile: SyncProfile, segmentId: string): FlodeskUpsertItem {
  return {
    email: profile.email!.trim().toLowerCase(),
    ...splitName(profile.full_name),
    segment_ids: [segmentId],
    double_optin: false,
  };
}

// ---------------------------------------------------------------------------
// Newsletter-only sync
//
// Newsletter Only rules do not go through getCategory(). Their "eligible set"
// is coming_soon_emails minus any email that already exists on a profile —
// i.e. signups who never made it past the newsletter form. When that email
// later becomes a profile (any tier) the next run sees them as ineligible
// and removes from the Flodesk segment.
// ---------------------------------------------------------------------------

export interface NewsletterCandidate {
  email: string;
  created_at: string;
}

export interface SyncNewsletterRow {
  rule_id: string;
  email: string;
  status: "added" | "removed" | "failed";
  flodesk_subscriber_id: string | null;
  attempt_count: number;
  last_error: string | null;
  added_at: string | null;
  removed_at: string | null;
  updated_at: string;
}

/**
 * Build the set of newsletter signup emails that should be IN the rule's
 * segment: in coming_soon_emails, NOT a profile's email, aged past delay_days.
 *
 * We load both sides via the admin client (case-insensitive comparison done
 * in SQL with LOWER()). The function does not return names — newsletter
 * signups only carry an email.
 */
export async function fetchNewsletterEligibleSet(
  admin: SupabaseClient,
  delayDays: number,
): Promise<Set<string>> {
  const PAGE = 1000;
  const eligible = new Set<string>();
  let page = 0;
  const cutoffIso =
    delayDays > 0
      ? new Date(Date.now() - delayDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  for (;;) {
    let q = admin
      .from("coming_soon_emails")
      .select("email, created_at")
      .not("email", "is", null);
    if (cutoffIso) q = q.lte("created_at", cutoffIso);

    const from = page * PAGE;
    const { data: rows, error } = await q.order("created_at", { ascending: true }).range(from, from + PAGE - 1);
    if (error) {
      console.error("[flodesk-sync] fetchNewsletterEligibleSet error:", error);
      break;
    }
    if (!rows || rows.length === 0) break;

    const emails = (rows as { email: string | null }[])
      .map((r) => (r.email || "").trim().toLowerCase())
      .filter(Boolean);

    // Subtract profiles.email via NOT IN. Profiles.email is also lowercase
    // (auth.users.email is normalized and the profiles trigger copies it).
    const profileEmails = new Set<string>();
    for (let i = 0; i < emails.length; i += PAGE) {
      const slice = emails.slice(i, i + PAGE);
      const { data: profRows } = await admin
        .from("profiles")
        .select("email")
        .in("email", slice);
      for (const p of (profRows || []) as { email: string | null }[]) {
        if (p.email) profileEmails.add(p.email.toLowerCase());
      }
    }

    for (const e of emails) {
      if (!profileEmails.has(e)) eligible.add(e);
    }

    if (rows.length < PAGE) break;
    page++;
  }

  return eligible;
}

/** Load existing state rows for newsletter rules (paginated past PostgREST's 1000 cap). */
async function fetchNewsletterMemberRows(
  admin: SupabaseClient,
  ruleIds: string[],
): Promise<SyncNewsletterRow[]> {
  if (ruleIds.length === 0) return [];
  const all: SyncNewsletterRow[] = [];
  let page = 0;
  for (;;) {
    const from = page * PAGE_SIZE;
    const { data, error } = await admin
      .from("flodesk_sync_newsletter")
      .select("*")
      .in("rule_id", ruleIds)
      .order("email", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[flodesk-sync] fetchNewsletterMemberRows error:", error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...(data as SyncNewsletterRow[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return all;
}

async function upsertNewsletterRows(admin: SupabaseClient, rows: Partial<SyncNewsletterRow>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await admin
    .from("flodesk_sync_newsletter")
    .upsert(rows, { onConflict: "rule_id,email" });
  if (error) console.error("[flodesk-sync] upsertNewsletterRows error:", error);
}

function toNewsletterUpsertItem(email: string, segmentId: string): FlodeskUpsertItem {
  return {
    email,
    segment_ids: [segmentId],
    double_optin: false,
  };
}

/**
 * Run one Newsletter Only rule — exits first, then additions — using the
 * precomputed eligible email set and the existing state rows. Honours
 * dryRun, the caller's summary budget/rate-limit flags, and the same throttle
 * constants used by the profile-keyed path.
 *
 * Mutates `flodesk_sync_newsletter` rows in non-dry-run mode. The caller is
 * responsible for stamping `last_run_at`. Counts are merged into
 * `summary.rules` by the caller.
 */
async function runNewsletterRule(params: {
  rule: {
    id: string;
    key: string;
    name: string;
    category: string;
    flodesk_segment_id: string | null;
    remove_on_exit: boolean;
  };
  eligible: Set<string>;
  existing: SyncNewsletterRow[];
  dryRun: boolean;
}): Promise<{
  added: number;
  removed: number;
  failed: number;
  remaining: number;
  rateLimited: boolean;
  budgetExhausted: boolean;
  sampleAdd?: string[];
  sampleRemove?: string[];
}> {
  const { rule, eligible, existing, dryRun } = params;
  const admin = getAdminClient();
  const segmentId = rule.flodesk_segment_id!;
  const startedAt = Date.now();
  const out = {
    added: 0,
    removed: 0,
    failed: 0,
    remaining: 0,
    rateLimited: false,
    budgetExhausted: false,
  } as {
    added: number;
    removed: number;
    failed: number;
    remaining: number;
    rateLimited: boolean;
    budgetExhausted: boolean;
    sampleAdd?: string[];
    sampleRemove?: string[];
  };

  // 1. EXITS — any 'added' row whose email is no longer eligible.
  const toRemove = rule.remove_on_exit
    ? existing.filter((row) => row.status === "added" && !eligible.has(row.email.toLowerCase()))
    : [];

  if (dryRun) {
    out.removed = toRemove.length;
    out.sampleRemove = toRemove.slice(0, SAMPLE_SIZE).map((r) => r.email);
  } else {
    for (let i = 0; i < toRemove.length; i++) {
      if (Date.now() - startedAt > DEFAULT_BUDGET_MS || out.rateLimited) {
        out.budgetExhausted = out.budgetExhausted || !out.rateLimited;
        out.remaining += toRemove.length - i;
        break;
      }
      const row = toRemove[i];
      const target = row.flodesk_subscriber_id || row.email;
      if (!target) {
        await upsertNewsletterRows(admin, [
          {
            rule_id: rule.id,
            email: row.email,
            status: "removed",
            removed_at: nowIso(),
            updated_at: nowIso(),
            last_error: "no subscriber id or email",
          },
        ]);
        out.removed++;
        continue;
      }
      const res = await removeFromSegments(target, [segmentId]);
      if (res.ok || res.status === 404) {
        await upsertNewsletterRows(admin, [
          {
            rule_id: rule.id,
            email: row.email,
            status: "removed",
            removed_at: nowIso(),
            updated_at: nowIso(),
            last_error: null,
          },
        ]);
        out.removed++;
      } else if (res.rateLimited) {
        out.rateLimited = true;
        out.remaining += toRemove.length - i;
        break;
      } else {
        await upsertNewsletterRows(admin, [
          { rule_id: rule.id, email: row.email, updated_at: nowIso(), last_error: `remove: ${res.error}` },
        ]);
        out.failed++;
      }
      if (i < toRemove.length - 1) await sleep(REMOVE_DELAY_MS);
    }
  }

  // 2. ADDITIONS — eligible emails minus rows already 'added' or failed over MAX_ATTEMPTS.
  const existingByEmail = new Map(existing.map((r) => [r.email.toLowerCase(), r]));
  const toAdd: string[] = [];
  for (const email of eligible) {
    const row = existingByEmail.get(email);
    if (!row) {
      toAdd.push(email);
      continue;
    }
    if (row.status === "added") continue;
    if (row.status === "failed" && row.attempt_count >= MAX_ATTEMPTS) continue;
    toAdd.push(email); // removed → may re-enter; failed under cap → retry
  }

  if (dryRun) {
    out.added = toAdd.length;
    out.sampleAdd = toAdd.slice(0, SAMPLE_SIZE);
    return out;
  }

  for (let i = 0; i < toAdd.length; i += FLODESK_BATCH_SIZE) {
    if (Date.now() - startedAt > DEFAULT_BUDGET_MS || out.rateLimited) {
      out.budgetExhausted = out.budgetExhausted || !out.rateLimited;
      out.remaining += toAdd.length - i;
      break;
    }
    const chunk = toAdd.slice(i, i + FLODESK_BATCH_SIZE);
    const byEmail = new Map(chunk.map((e) => [e.toLowerCase(), e]));
    const res = await batchUpsertSubscribers(chunk.map((e) => toNewsletterUpsertItem(e, segmentId)));

    if (!res.ok) {
      if (res.rateLimited) {
        out.rateLimited = true;
        out.remaining += toAdd.length - i;
        break;
      }
      await upsertNewsletterRows(
        admin,
        chunk.map((email) => {
          const existingRow = existingByEmail.get(email.toLowerCase());
          return {
            rule_id: rule.id,
            email,
            status: "failed" as const,
            attempt_count: (existingRow?.attempt_count ?? 0) + 1,
            last_error: `batch: ${res.error}`,
            updated_at: nowIso(),
          };
        }),
      );
      out.failed += chunk.length;
      console.error(`[flodesk-sync] newsletter batch failed for rule ${rule.key}:`, res.error);
    } else {
      const rows: Partial<SyncNewsletterRow>[] = [];
      const matched = new Set<string>();
      for (const sub of res.data.successes) {
        const lookup = (sub.email || "").trim().toLowerCase();
        const originalEmail = byEmail.get(lookup);
        if (!originalEmail) continue;
        matched.add(lookup);
        rows.push({
          rule_id: rule.id,
          email: originalEmail,
          status: "added",
          flodesk_subscriber_id: sub.id,
          added_at: nowIso(),
          removed_at: null,
          last_error: null,
          updated_at: nowIso(),
        });
        out.added++;
      }
      for (const f of res.data.failures) {
        const lookup = (f.email || "").trim().toLowerCase();
        let originalEmail: string | undefined;
        if (lookup && byEmail.has(lookup)) originalEmail = byEmail.get(lookup);
        else if (typeof f.index === "number") originalEmail = chunk[f.index];
        if (!originalEmail) continue;
        const key = originalEmail.toLowerCase();
        if (matched.has(key)) continue;
        matched.add(key);
        const existingRow = existingByEmail.get(key);
        rows.push({
          rule_id: rule.id,
          email: originalEmail,
          status: "failed",
          attempt_count: (existingRow?.attempt_count ?? 0) + 1,
          last_error: `${f.code || "error"}: ${f.message || "unknown"}`,
          updated_at: nowIso(),
        });
        out.failed++;
      }
      for (const email of chunk) {
        const key = email.toLowerCase();
        if (matched.has(key)) continue;
        const existingRow = existingByEmail.get(key);
        rows.push({
          rule_id: rule.id,
          email,
          status: "failed",
          attempt_count: (existingRow?.attempt_count ?? 0) + 1,
          last_error: "not present in batch response",
          updated_at: nowIso(),
        });
        out.failed++;
      }
      await upsertNewsletterRows(admin, rows);
    }

    if (i + FLODESK_BATCH_SIZE < toAdd.length) await sleep(BATCH_DELAY_MS);
  }

  return out;
}

export async function runFlodeskSync(opts: RunOptions = {}): Promise<RunSummary> {
  const started = Date.now();
  const dryRun = Boolean(opts.dryRun);
  const budget = opts.timeBudgetMs ?? DEFAULT_BUDGET_MS;
  const overBudget = () => Date.now() - started > budget;

  const summary: RunSummary = {
    ok: true,
    dryRun,
    startedAt: new Date(started).toISOString(),
    durationMs: 0,
    budgetExhausted: false,
    rateLimited: false,
    rules: [],
  };

  if (!dryRun && !isFlodeskConfigured()) {
    summary.skipped = "not_configured";
    summary.durationMs = Date.now() - started;
    return summary;
  }

  const admin = getAdminClient();

  try {
    // 1. Rules
    const rules = (
      opts.ruleId
        ? await fetchRules(admin, { ruleId: opts.ruleId })
        : await fetchRules(admin, { enabledOnly: true })
    ).filter((r) => Boolean(r.flodesk_segment_id));

    if (rules.length === 0) {
      summary.skipped = "no_rules";
      summary.durationMs = Date.now() - started;
      return summary;
    }

    // 2. One snapshot of profiles + existing state
    const profiles = await fetchAllSyncProfiles(admin);
    const profileById = new Map(profiles.map((p) => [p.id, p]));
    const memberRows = await fetchMemberRows(admin, rules.map((r) => r.id));
    const memberByKey = new Map(memberRows.map((m) => [memberKey(m.rule_id, m.profile_id), m]));

    const results = new Map<string, RuleRunResult>(
      rules.map((r) => [
        r.id,
        { ruleId: r.id, key: r.key, name: r.name, category: r.category, added: 0, removed: 0, failed: 0, remaining: 0 },
      ]),
    );

    // 3. EXITS first
    for (const rule of rules) {
      if (!rule.remove_on_exit) continue;
      const result = results.get(rule.id)!;
      const segmentId = rule.flodesk_segment_id!;

      const toRemove = memberRows.filter(
        (m) => m.rule_id === rule.id && m.status === "added" && !isStillEligible(profileById.get(m.profile_id), rule),
      );

      if (dryRun) {
        result.removed = toRemove.length;
        result.sampleRemove = toRemove
          .slice(0, SAMPLE_SIZE)
          .map((m) => profileById.get(m.profile_id)?.email || m.flodesk_subscriber_id || m.profile_id);
        continue;
      }

      for (let i = 0; i < toRemove.length; i++) {
        if (summary.rateLimited || overBudget()) {
          summary.budgetExhausted = summary.budgetExhausted || !summary.rateLimited;
          result.remaining += toRemove.length - i;
          break;
        }
        const row = toRemove[i];
        const target = row.flodesk_subscriber_id || profileById.get(row.profile_id)?.email;
        if (!target) {
          // Nothing we can address in Flodesk; mark removed so it stops reappearing.
          await upsertMemberRows(admin, [
            { rule_id: rule.id, profile_id: row.profile_id, status: "removed", removed_at: nowIso(), updated_at: nowIso(), last_error: "no subscriber id or email" },
          ]);
          result.removed++;
          continue;
        }

        const res = await removeFromSegments(target, [segmentId]);
        if (res.ok || res.status === 404) {
          await upsertMemberRows(admin, [
            { rule_id: rule.id, profile_id: row.profile_id, status: "removed", removed_at: nowIso(), updated_at: nowIso(), last_error: null },
          ]);
          result.removed++;
        } else if (res.rateLimited) {
          summary.rateLimited = true;
          result.remaining += toRemove.length - i;
          break;
        } else {
          await upsertMemberRows(admin, [
            { rule_id: rule.id, profile_id: row.profile_id, updated_at: nowIso(), last_error: `remove: ${res.error}` },
          ]);
          result.failed++;
        }
        if (i < toRemove.length - 1) await sleep(REMOVE_DELAY_MS);
      }
    }

    // 4. ADDITIONS
    const now = new Date();
    for (const rule of rules) {
      const result = results.get(rule.id)!;
      const segmentId = rule.flodesk_segment_id!;

      const candidates = profiles.filter((p) => {
        if (!isEligibleForAdd(p, rule, now)) return false;
        const existing = memberByKey.get(memberKey(rule.id, p.id));
        if (!existing) return true;
        if (existing.status === "added") return false;
        if (existing.status === "failed" && existing.attempt_count >= MAX_ATTEMPTS) return false;
        return true; // removed → may re-enter; failed under cap → retry
      });

      if (dryRun) {
        result.added = candidates.length;
        result.sampleAdd = candidates.slice(0, SAMPLE_SIZE).map((p) => p.email!);
        continue;
      }

      for (let i = 0; i < candidates.length; i += FLODESK_BATCH_SIZE) {
        if (summary.rateLimited || overBudget()) {
          summary.budgetExhausted = summary.budgetExhausted || !summary.rateLimited;
          result.remaining += candidates.length - i;
          break;
        }
        const chunk = candidates.slice(i, i + FLODESK_BATCH_SIZE);
        const byEmail = new Map(chunk.map((p) => [p.email!.trim().toLowerCase(), p]));
        const res = await batchUpsertSubscribers(chunk.map((p) => toUpsertItem(p, segmentId)));

        if (!res.ok) {
          if (res.rateLimited) {
            summary.rateLimited = true;
            result.remaining += candidates.length - i;
            break;
          }
          // Whole-call failure: record attempt on every row in the chunk
          await upsertMemberRows(
            admin,
            chunk.map((p) => {
              const existing = memberByKey.get(memberKey(rule.id, p.id));
              return {
                rule_id: rule.id,
                profile_id: p.id,
                status: "failed" as const,
                attempt_count: (existing?.attempt_count ?? 0) + 1,
                last_error: `batch: ${res.error}`,
                updated_at: nowIso(),
              };
            }),
          );
          result.failed += chunk.length;
          console.error(`[flodesk-sync] batch failed for rule ${rule.key}:`, res.error);
        } else {
          const rows: Partial<SyncMemberRow>[] = [];
          const matched = new Set<string>();

          for (const sub of res.data.successes) {
            const p = byEmail.get((sub.email || "").trim().toLowerCase());
            if (!p) continue;
            matched.add(p.id);
            rows.push({
              rule_id: rule.id,
              profile_id: p.id,
              status: "added",
              flodesk_subscriber_id: sub.id,
              added_at: nowIso(),
              removed_at: null,
              last_error: null,
              updated_at: nowIso(),
            });
            result.added++;
          }

          for (const f of res.data.failures) {
            const p =
              (f.email && byEmail.get(f.email.trim().toLowerCase())) ||
              (typeof f.index === "number" ? chunk[f.index] : undefined);
            if (!p || matched.has(p.id)) continue;
            matched.add(p.id);
            const existing = memberByKey.get(memberKey(rule.id, p.id));
            rows.push({
              rule_id: rule.id,
              profile_id: p.id,
              status: "failed",
              attempt_count: (existing?.attempt_count ?? 0) + 1,
              last_error: `${f.code || "error"}: ${f.message || "unknown"}`,
              updated_at: nowIso(),
            });
            result.failed++;
          }

          // Anything Flodesk didn't echo back at all — treat as failed so it retries
          for (const p of chunk) {
            if (matched.has(p.id)) continue;
            const existing = memberByKey.get(memberKey(rule.id, p.id));
            rows.push({
              rule_id: rule.id,
              profile_id: p.id,
              status: "failed",
              attempt_count: (existing?.attempt_count ?? 0) + 1,
              last_error: "not present in batch response",
              updated_at: nowIso(),
            });
            result.failed++;
          }

          await upsertMemberRows(admin, rows);
        }

        if (i + FLODESK_BATCH_SIZE < candidates.length) await sleep(BATCH_DELAY_MS);
      }
    }

    // 4b. NEWSLETTER ONLY rules — exits then additions, by email
    const newsletterRules = rules.filter((r) => r.category === "Newsletter Only");
    if (newsletterRules.length > 0) {
      // One eligible set per rule (delay_days may differ per rule).
      const eligibleByRule = new Map<string, Set<string>>();
      for (const rule of newsletterRules) {
        eligibleByRule.set(rule.id, await fetchNewsletterEligibleSet(admin, rule.delay_days));
      }
      const newsletterRows = await fetchNewsletterMemberRows(
        admin,
        newsletterRules.map((r) => r.id),
      );
      const newsletterRowsByRule = new Map<string, SyncNewsletterRow[]>();
      for (const row of newsletterRows) {
        const list = newsletterRowsByRule.get(row.rule_id) ?? [];
        list.push(row);
        newsletterRowsByRule.set(row.rule_id, list);
      }

      for (const rule of newsletterRules) {
        if (summary.rateLimited || overBudget()) {
          summary.budgetExhausted = summary.budgetExhausted || !summary.rateLimited;
          break;
        }
        const result = await runNewsletterRule({
          rule,
          eligible: eligibleByRule.get(rule.id) ?? new Set(),
          existing: newsletterRowsByRule.get(rule.id) ?? [],
          dryRun,
        });
        if (result.rateLimited) summary.rateLimited = true;
        if (result.budgetExhausted) summary.budgetExhausted = true;
        // Preserve upstream result placeholder
        const existing = results.get(rule.id);
        results.set(rule.id, {
          ruleId: rule.id,
          key: rule.key,
          name: rule.name,
          category: rule.category,
          added: result.added + (existing?.added ?? 0),
          removed: result.removed + (existing?.removed ?? 0),
          failed: result.failed + (existing?.failed ?? 0),
          remaining: result.remaining + (existing?.remaining ?? 0),
          sampleAdd: result.sampleAdd ?? existing?.sampleAdd,
          sampleRemove: result.sampleRemove ?? existing?.sampleRemove,
        });
      }
    }

    // 5. Stamp last_run_at
    if (!dryRun) {
      await admin
        .from("flodesk_sync_rules")
        .update({ last_run_at: nowIso() })
        .in("id", rules.map((r) => r.id));
    }

    summary.rules = Array.from(results.values());
  } catch (err) {
    summary.ok = false;
    summary.error = err instanceof Error ? err.message : String(err);
    console.error("[flodesk-sync] run failed:", err);
  }

  summary.durationMs = Date.now() - started;
  return summary;
}

// ---------------------------------------------------------------------------
// Single-profile hooks
// ---------------------------------------------------------------------------

/**
 * Re-evaluate one profile against every enabled rule immediately.
 * Safe to call fire-and-forget: never throws, logs on failure.
 */
export async function resyncProfileNow(profileId: string): Promise<void> {
  if (!isFlodeskConfigured()) return;
  try {
    const admin = getAdminClient();
    const rules = (await fetchRules(admin, { enabledOnly: true })).filter((r) => r.flodesk_segment_id);
    if (rules.length === 0) return;

    const profile = await fetchSyncProfile(admin, profileId);
    const { data: rowsData } = await admin.from("flodesk_sync_members").select("*").eq("profile_id", profileId);
    const rows = (rowsData || []) as SyncMemberRow[];
    const rowByRule = new Map(rows.map((r) => [r.rule_id, r]));

    // Exits
    for (const rule of rules) {
      if (!rule.remove_on_exit) continue;
      const row = rowByRule.get(rule.id);
      if (!row || row.status !== "added") continue;
      if (isStillEligible(profile, rule)) continue;

      const target = row.flodesk_subscriber_id || profile?.email;
      if (!target) continue;
      const res = await removeFromSegments(target, [rule.flodesk_segment_id!]);
      if (res.ok || res.status === 404) {
        await upsertMemberRows(admin, [
          { rule_id: rule.id, profile_id: profileId, status: "removed", removed_at: nowIso(), updated_at: nowIso(), last_error: null },
        ]);
      } else {
        await upsertMemberRows(admin, [{ rule_id: rule.id, profile_id: profileId, updated_at: nowIso(), last_error: `remove: ${res.error}` }]);
      }
    }

    // Additions
    if (!profile) return;
    for (const rule of rules) {
      const row = rowByRule.get(rule.id);
      if (row?.status === "added") continue;
      if (row?.status === "failed" && row.attempt_count >= MAX_ATTEMPTS) continue;
      if (!isEligibleForAdd(profile, rule)) continue;

      const res = await batchUpsertSubscribers([toUpsertItem(profile, rule.flodesk_segment_id!)]);
      if (res.ok && res.data.successes[0]) {
        await upsertMemberRows(admin, [
          {
            rule_id: rule.id,
            profile_id: profileId,
            status: "added",
            flodesk_subscriber_id: res.data.successes[0].id,
            added_at: nowIso(),
            removed_at: null,
            last_error: null,
            updated_at: nowIso(),
          },
        ]);
      } else {
        const err = res.ok ? res.data.failures[0]?.message || "not in response" : res.error;
        await upsertMemberRows(admin, [
          {
            rule_id: rule.id,
            profile_id: profileId,
            status: "failed",
            attempt_count: (row?.attempt_count ?? 0) + 1,
            last_error: `add: ${err}`,
            updated_at: nowIso(),
          },
        ]);
      }
    }
  } catch (err) {
    console.error("[flodesk-sync] resyncProfileNow failed:", err);
  }
}

/**
 * Remove EVERY member currently `added` under a rule from its segment.
 * Used by the admin "Clear segment" action (e.g. before disabling/deleting a rule).
 * Respects the time budget; call again if `remaining` > 0.
 */
export async function clearRule(
  ruleId: string,
  opts: { timeBudgetMs?: number } = {},
): Promise<{ ok: boolean; removed: number; failed: number; remaining: number; error?: string }> {
  const started = Date.now();
  const budget = opts.timeBudgetMs ?? DEFAULT_BUDGET_MS;
  const out = { ok: true, removed: 0, failed: 0, remaining: 0 } as {
    ok: boolean;
    removed: number;
    failed: number;
    remaining: number;
    error?: string;
  };
  if (!isFlodeskConfigured()) return { ...out, ok: false, error: "not_configured" };

  try {
    const admin = getAdminClient();
    const [rule] = await fetchRules(admin, { ruleId });
    if (!rule?.flodesk_segment_id) return { ...out, ok: false, error: "rule not found or has no segment" };

    const rows = (await fetchMemberRows(admin, [rule.id])).filter((r) => r.status === "added");
    const ids = rows.map((r) => r.profile_id);
    const emailById = new Map<string, string | null>();
    for (let i = 0; i < ids.length; i += PAGE_SIZE) {
      const { data } = await admin.from("profiles").select("id, email").in("id", ids.slice(i, i + PAGE_SIZE));
      for (const p of (data || []) as { id: string; email: string | null }[]) emailById.set(p.id, p.email);
    }

    for (let i = 0; i < rows.length; i++) {
      if (Date.now() - started > budget) {
        out.remaining = rows.length - i;
        break;
      }
      const row = rows[i];
      const target = row.flodesk_subscriber_id || emailById.get(row.profile_id);
      const res = target ? await removeFromSegments(target, [rule.flodesk_segment_id]) : ({ ok: true } as const);
      if (res.ok || ("status" in res && res.status === 404)) {
        await upsertMemberRows(admin, [
          { rule_id: rule.id, profile_id: row.profile_id, status: "removed", removed_at: nowIso(), updated_at: nowIso(), last_error: null },
        ]);
        out.removed++;
      } else if ("rateLimited" in res && res.rateLimited) {
        out.remaining = rows.length - i;
        break;
      } else {
        await upsertMemberRows(admin, [
          { rule_id: rule.id, profile_id: row.profile_id, updated_at: nowIso(), last_error: `clear: ${"error" in res ? res.error : "unknown"}` },
        ]);
        out.failed++;
      }
      if (i < rows.length - 1) await sleep(REMOVE_DELAY_MS);
    }
  } catch (err) {
    out.ok = false;
    out.error = err instanceof Error ? err.message : String(err);
    console.error("[flodesk-sync] clearRule failed:", err);
  }
  return out;
}

/**
 * Remove a profile from every rule segment it's in. Used by account
 * anonymization; call BEFORE the email is wiped so the email fallback works
 * for rows that predate subscriber-id tracking.
 */
export async function removeProfileFromFlodesk(
  profileId: string,
  opts: { unsubscribe?: boolean } = {},
): Promise<{ removed: number; unsubscribed: boolean }> {
  const out = { removed: 0, unsubscribed: false };
  if (!isFlodeskConfigured()) return out;
  try {
    const admin = getAdminClient();
    const { data: rowsData } = await admin
      .from("flodesk_sync_members")
      .select("*")
      .eq("profile_id", profileId)
      .eq("status", "added");
    const rows = (rowsData || []) as SyncMemberRow[];

    const { data: profileData } = await admin.from("profiles").select("email").eq("id", profileId).maybeSingle();
    const email = (profileData as { email?: string | null } | null)?.email || null;

    const rules = await fetchRules(admin, {});
    const ruleById = new Map(rules.map((r) => [r.id, r]));

    let anyTarget: string | null = null;
    for (const row of rows) {
      const rule = ruleById.get(row.rule_id);
      const target = row.flodesk_subscriber_id || email;
      if (!target) continue;
      anyTarget = anyTarget || target;
      if (rule?.flodesk_segment_id) {
        const res = await removeFromSegments(target, [rule.flodesk_segment_id]);
        if (!res.ok && res.status !== 404) {
          console.error(`[flodesk-sync] anonymize remove failed for ${profileId}:`, res.error);
          continue;
        }
      }
      await upsertMemberRows(admin, [
        { rule_id: row.rule_id, profile_id: profileId, status: "removed", removed_at: nowIso(), updated_at: nowIso(), last_error: null },
      ]);
      out.removed++;
      await sleep(REMOVE_DELAY_MS);
    }

    if (opts.unsubscribe) {
      const target = anyTarget || email;
      if (target) {
        const res = await unsubscribeSubscriber(target);
        if (res.ok || res.status === 404) {
          out.unsubscribed = true;
        } else {
          console.error(`[flodesk-sync] unsubscribe failed for ${profileId}:`, res.error);
        }
      }
    }
  } catch (err) {
    console.error("[flodesk-sync] removeProfileFromFlodesk failed:", err);
  }
  return out;
}
