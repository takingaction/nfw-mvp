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
// Full run
// ---------------------------------------------------------------------------

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
