/**
 * Flodesk sync rules: which members belong in which Flodesk segment.
 *
 * A rule targets a member *category* as defined by getCategory() in
 * lib/member-categories.ts — the same function that drives /admin/members,
 * /admin/analytics and the members CSV. Entry and exit both use it, so a
 * member who moves Profile Incomplete → Abandoned → Waitlist → Free leaves each
 * segment and enters the next automatically.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCategory } from "@/lib/member-categories";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const RULE_CATEGORIES = [
  "Waitlist",
  "Abandoned",
  "Profile Incomplete",
  "Free",
  "Contributing",
  "Founding",
  // Newsletter Only does NOT go through getCategory() — it is evaluated off
  // (coming_soon_emails \ profiles.email). The sync engine branches on this
  // value in lib/flodesk-sync.ts::runFlodeskSync().
  "Newsletter Only",
] as const;

export type RuleCategory = (typeof RULE_CATEGORIES)[number];

export interface FlodeskSyncRule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: RuleCategory;
  delay_days: number;
  flodesk_segment_id: string | null;
  flodesk_segment_name: string | null;
  remove_on_exit: boolean;
  is_enabled: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

/** The minimal profile shape needed to evaluate every rule. */
export interface SyncProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  membership_level: string | null;
  is_approved_free_member: boolean | null;
  profile_completed: boolean | null;
  free_membership_contact_submitted: boolean | null;
  is_admin: boolean | null;
  joined_at: string | null;
  waitlist_joined_at: string | null;
}

export const SYNC_PROFILE_COLUMNS =
  "id, email, full_name, membership_level, is_approved_free_member, profile_completed, free_membership_contact_submitted, is_admin, joined_at, waitlist_joined_at";

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

/**
 * Timestamp that marks when a member *entered* the category. Used with
 * delay_days. Waitlist has its own column; every other category falls back to
 * joined_at because no per-category entry timestamp exists in the schema.
 */
export function categoryEnteredAt(profile: SyncProfile, category: RuleCategory): string | null {
  if (category === "Waitlist") return profile.waitlist_joined_at ?? profile.joined_at;
  return profile.joined_at;
}

/** True when the profile is currently in the rule's category (ignores delay). */
export function isInCategory(profile: SyncProfile, rule: Pick<FlodeskSyncRule, "category">): boolean {
  return getCategory(profile as unknown as Record<string, unknown>) === rule.category;
}

/**
 * True when the profile should be *added* to the rule's segment:
 * in category, has an email, and has been there for at least delay_days.
 */
export function isEligibleForAdd(
  profile: SyncProfile,
  rule: Pick<FlodeskSyncRule, "category" | "delay_days">,
  now: Date = new Date(),
): boolean {
  if (!profile.email) return false;
  if (!isInCategory(profile, rule)) return false;
  if (rule.delay_days <= 0) return true;

  const enteredAt = categoryEnteredAt(profile, rule.category);
  if (!enteredAt) return false;
  const cutoff = now.getTime() - rule.delay_days * 24 * 60 * 60 * 1000;
  return new Date(enteredAt).getTime() <= cutoff;
}

/** True when a member already in the segment should stay there. */
export function isStillEligible(profile: SyncProfile | null | undefined, rule: Pick<FlodeskSyncRule, "category">): boolean {
  // Profile gone (hard delete) or anonymized (membership_level = 'deleted' → "Unknown") → exit.
  if (!profile) return false;
  return isInCategory(profile, rule);
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

const PAGE_SIZE = 1000;

/**
 * Load every profile with the columns needed for category evaluation.
 * Paginates past PostgREST's 1000-row default cap.
 */
export async function fetchAllSyncProfiles(admin: SupabaseClient): Promise<SyncProfile[]> {
  const all: SyncProfile[] = [];
  let page = 0;
  for (;;) {
    const from = page * PAGE_SIZE;
    const { data, error } = await admin
      .from("profiles")
      .select(SYNC_PROFILE_COLUMNS)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("[flodesk-rules] fetchAllSyncProfiles error:", error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...(data as unknown as SyncProfile[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return all;
}

export async function fetchSyncProfile(admin: SupabaseClient, profileId: string): Promise<SyncProfile | null> {
  const { data, error } = await admin
    .from("profiles")
    .select(SYNC_PROFILE_COLUMNS)
    .eq("id", profileId)
    .maybeSingle();
  if (error) {
    console.error("[flodesk-rules] fetchSyncProfile error:", error);
    return null;
  }
  return (data as unknown as SyncProfile) ?? null;
}

export async function fetchRules(
  admin: SupabaseClient,
  opts: { enabledOnly?: boolean; ruleId?: string } = {},
): Promise<FlodeskSyncRule[]> {
  let q = admin.from("flodesk_sync_rules").select("*").order("created_at", { ascending: true });
  if (opts.enabledOnly) q = q.eq("is_enabled", true);
  if (opts.ruleId) q = q.eq("id", opts.ruleId);
  const { data, error } = await q;
  if (error) {
    console.error("[flodesk-rules] fetchRules error:", error);
    return [];
  }
  return (data || []) as FlodeskSyncRule[];
}
