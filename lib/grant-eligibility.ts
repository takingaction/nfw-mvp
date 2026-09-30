/**
 * Grant cycle eligibility + Late Submission Passes (migration 196).
 *
 * A pass lets one member apply to a CLOSED cycle without reopening it
 * publicly. Server-only: uses the service-role client.
 *
 * Rules:
 *   - Normal: cycle.status === "open" AND end_date >= today (New York time).
 *             The end_date check is the hard 11:59 PM ET deadline (2026-09-30).
 *   - Pass:   member holds a pass that is not revoked, not used, not expired,
 *             AND first review is not locked for the cycle.
 *
 * First review is "locked" once the first reviewer clicks Mark Review
 * Complete (scoring_completed_at), or the cycle is finalized. A late
 * application after that point would never get a first-reviewer score.
 */
import getAdminClient from "@/lib/supabase/admin";
import { todayInNewYork } from "@/lib/dates";

export const LATE_PASS_DURATION_HOURS = 12;

export interface CycleLockFields {
  scoring_completed_at?: string | null;
  final_approved_at?: string | null;
  is_finalized?: boolean | null;
}

export interface LatePass {
  id: string;
  cycle_id: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
}

export type PassStatus = "active" | "used" | "expired" | "revoked";

/**
 * True once the cycle's end_date is before today in New York time.
 * Cycles accept applications through 11:59:59 PM ET on end_date. This is the
 * hard deadline at submission time — it does not depend on the status cron
 * (sync_grant_cycle_statuses) having run. Missing end_date → not past.
 */
export function isPastEndDate(cycle: { end_date?: string | null }): boolean {
  if (!cycle.end_date) return false;
  return String(cycle.end_date).split("T")[0] < todayInNewYork();
}

export function isFirstReviewLocked(cycle: CycleLockFields): boolean {
  return Boolean(cycle.scoring_completed_at || cycle.final_approved_at || cycle.is_finalized);
}

export function getPassStatus(pass: {
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
}): PassStatus {
  if (pass.revoked_at) return "revoked";
  if (pass.used_at) return "used";
  if (new Date(pass.expires_at).getTime() <= Date.now()) return "expired";
  return "active";
}

/** The member's live pass for a cycle, or null. */
export async function getActivePass(userId: string, cycleId: string): Promise<LatePass | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("grant_cycle_exceptions")
    .select("id, cycle_id, user_id, expires_at, used_at, revoked_at")
    .eq("user_id", userId)
    .eq("cycle_id", cycleId)
    .is("used_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[grant-eligibility] getActivePass error:", error);
    return null;
  }
  return (data as LatePass) ?? null;
}

export interface EligibilityResult {
  ok: boolean;
  viaPass: boolean;
  pass: LatePass | null;
}

/**
 * Can this member submit to this cycle right now?
 * `cycle` must include id, status and the lock fields.
 */
export async function checkCycleEligibility(
  userId: string,
  cycle: { id: string; status: string; end_date?: string | null } & CycleLockFields,
): Promise<EligibilityResult> {
  // Open + not past end_date (NY time) → allowed. An "open" cycle past its
  // end_date falls through to the pass check, same as a closed cycle.
  // start_date is deliberately NOT checked so admins can open a cycle early.
  if (cycle.status === "open" && !isPastEndDate(cycle)) {
    return { ok: true, viaPass: false, pass: null };
  }
  if (isFirstReviewLocked(cycle)) return { ok: false, viaPass: false, pass: null };
  const pass = await getActivePass(userId, cycle.id);
  if (!pass) return { ok: false, viaPass: false, pass: null };
  return { ok: true, viaPass: true, pass };
}

/** Columns needed from grant_cycles to evaluate lock state. */
export const CYCLE_LOCK_COLUMNS = "scoring_completed_at, final_approved_at, is_finalized";

/**
 * Closed cycles the member holds a live, unlocked pass for, with the
 * pass expiry attached. Returns full cycle rows (`select("*")`) so callers
 * can merge them into their open-cycle list.
 */
export async function listPassCyclesForUser(
  userId: string,
): Promise<Array<Record<string, unknown> & { id: string; viaPass: true; passExpiresAt: string }>> {
  const admin = getAdminClient();
  const { data: passes, error } = await admin
    .from("grant_cycle_exceptions")
    .select("cycle_id, expires_at")
    .eq("user_id", userId)
    .is("used_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());
  if (error) {
    console.error("[grant-eligibility] listPassCyclesForUser error:", error);
    return [];
  }
  if (!passes || passes.length === 0) return [];

  const expiryByCycle = new Map<string, string>();
  for (const p of passes) expiryByCycle.set(p.cycle_id, p.expires_at);

  const { data: cycles, error: cyclesError } = await admin
    .from("grant_cycles")
    .select("*")
    .in("id", [...expiryByCycle.keys()]);
  if (cyclesError) {
    console.error("[grant-eligibility] listPassCyclesForUser cycles error:", cyclesError);
    return [];
  }

  return (cycles ?? [])
    .filter((c) => !isFirstReviewLocked(c))
    .map((c) => ({
      ...c,
      viaPass: true as const,
      passExpiresAt: expiryByCycle.get(c.id)!,
    }));
}

/**
 * Mark a pass used after a successful submission. Only updates if still
 * unused, so concurrent submissions can't double-consume.
 */
export async function markPassUsed(passId: string, grantId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from("grant_cycle_exceptions")
    .update({ used_at: new Date().toISOString(), used_grant_id: grantId })
    .eq("id", passId)
    .is("used_at", null);
  if (error) console.error("[grant-eligibility] markPassUsed error:", error);
}
