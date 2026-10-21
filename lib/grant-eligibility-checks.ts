/**
 * Deterministic grant eligibility checks (server-only).
 *
 * These criteria are facts the database can answer exactly, so they are
 * checked in code rather than by the AI:
 *
 *   membership          hasMemberAccess(): contributing/founding, or a free
 *                       member approved from the waitlist, and not paused.
 *                       Checked at review time, not just at submission, so a
 *                       membership that lapsed after applying is caught.
 *   grant_restrictions  NFW's consecutive-monthly-awards policy: a member who
 *                       was awarded a grant (any type) in a cycle whose
 *                       end_date falls in the month before this cycle's end
 *                       month is not eligible. Testing-only cycles don't count.
 *
 * Batch API so workers and the draw route can check many members in a few
 * queries.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { MEMBER_ACCESS_COLUMNS, hasTierAccess, isAccessPaused } from "@/lib/member-access";
import { fetchAllPagesIn } from "@/lib/supabase-paginate";
import type { CriterionResult, EligibilityChecks } from "@/lib/grant-criteria";

/** Grant statuses that count as "received an award". */
export const AWARDED_STATUSES = ["approved", "payment_pending", "payment_sent"] as const;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * The calendar month before the month of `endDate` ("YYYY-MM-DD..."), as a
 * half-open date range [start, end) plus a display label. Pure string math so
 * the server's time zone can't shift the month.
 */
export function priorMonthRange(endDate: string): { start: string; end: string; label: string } | null {
  const m = /^(\d{4})-(\d{2})/.exec(String(endDate));
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${prevYear}-${pad(prevMonth)}-01`,
    end: `${year}-${pad(month)}-01`,
    label: `${MONTH_NAMES[prevMonth - 1]} ${prevYear}`,
  };
}

export interface EligibilityCycle {
  id: string;
  end_date: string | null;
}

interface ProfileRow {
  id: string;
  membership_level: string | null;
  is_approved_free_member: boolean | null;
  access_paused_at: string | null;
}

export function membershipResult(profile: ProfileRow | null | undefined): CriterionResult {
  if (!profile) return { verdict: "uncertain", note: "Member profile not found." };
  if (isAccessPaused(profile)) {
    return { verdict: "fail", note: "Membership access is paused." };
  }
  if (hasTierAccess(profile)) {
    const level = profile.membership_level;
    const label =
      level === "free" ? "Approved free member" :
      level === "founding" ? "Founding member" :
      level === "contributing" ? "Contributing member" : "Member";
    return { verdict: "pass", note: `${label}, not paused.` };
  }
  if (profile.membership_level === "free") {
    return { verdict: "fail", note: "Free member who has not been approved from the waitlist." };
  }
  return {
    verdict: "fail",
    note: `No eligible membership (level: ${profile.membership_level || "none"}).`,
  };
}

/**
 * Run both code checks for every user in `userIds` against `cycle`.
 * Query failures produce "uncertain" results rather than throwing, so one bad
 * lookup never blocks an evaluation run.
 */
export async function runEligibilityChecks(
  admin: SupabaseClient,
  cycle: EligibilityCycle,
  userIds: string[],
): Promise<Map<string, EligibilityChecks>> {
  const checkedAt = new Date().toISOString();
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const out = new Map<string, EligibilityChecks>();
  if (ids.length === 0) return out;

  // ── Membership ──────────────────────────────────────────────────────
  const profilesRes = await fetchAllPagesIn<ProfileRow>(ids, (chunk, from, to) =>
    admin
      .from("profiles")
      .select(`id, ${MEMBER_ACCESS_COLUMNS}`)
      .in("id", chunk)
      .order("id", { ascending: true })
      .range(from, to),
  );
  const profileById = new Map<string, ProfileRow>();
  if (profilesRes.error) {
    console.error("[grant-eligibility-checks] profile lookup failed:", profilesRes.error);
  } else {
    for (const p of profilesRes.data) profileById.set(p.id, p);
  }

  // ── Consecutive monthly awards ─────────────────────────────────────
  const range = cycle.end_date ? priorMonthRange(cycle.end_date) : null;
  let restrictionError: string | null = range ? null : "Cycle has no end date.";
  const awardsByUser = new Map<string, string[]>();

  if (range) {
    const { data: priorCycles, error: cyclesErr } = await admin
      .from("grant_cycles")
      .select("id, cycle_name")
      .gte("end_date", range.start)
      .lt("end_date", range.end)
      .eq("is_testing_only", false)
      .neq("id", cycle.id);

    if (cyclesErr) {
      console.error("[grant-eligibility-checks] prior cycle lookup failed:", cyclesErr);
      restrictionError = "Could not look up prior-month cycles.";
    } else if (priorCycles && priorCycles.length > 0) {
      const nameById = new Map(priorCycles.map((c) => [c.id as string, (c.cycle_name as string) || "a grant"]));
      const priorIds = [...nameById.keys()];
      // Chunk by user; filter cycles with .in (few prior cycles per month).
      const awardsRes = await fetchAllPagesIn<{ id: string; user_id: string; cycle_id: string }>(
        ids,
        (chunk, from, to) =>
          admin
            .from("grants")
            .select("id, user_id, cycle_id")
            .in("user_id", chunk)
            .in("cycle_id", priorIds)
            .in("status", [...AWARDED_STATUSES])
            .order("id", { ascending: true })
            .range(from, to),
      );
      if (awardsRes.error) {
        console.error("[grant-eligibility-checks] award lookup failed:", awardsRes.error);
        restrictionError = "Could not look up prior-month awards.";
      } else {
        for (const a of awardsRes.data) {
          const list = awardsByUser.get(a.user_id) ?? [];
          list.push(nameById.get(a.cycle_id) || "a grant");
          awardsByUser.set(a.user_id, list);
        }
      }
    }
  }

  for (const userId of ids) {
    const membership: CriterionResult = profilesRes.error
      ? { verdict: "uncertain", note: "Could not look up membership." }
      : membershipResult(profileById.get(userId));

    let grant_restrictions: CriterionResult;
    if (restrictionError) {
      grant_restrictions = { verdict: "uncertain", note: restrictionError };
    } else {
      const awards = awardsByUser.get(userId);
      grant_restrictions = awards && awards.length > 0
        ? {
            verdict: "fail",
            note: `Awarded in a ${range!.label} cycle (${awards.join(", ")}); consecutive monthly awards are not allowed.`,
          }
        : { verdict: "pass", note: `No award in a ${range!.label} cycle.` };
    }

    out.set(userId, { membership, grant_restrictions, checked_at: checkedAt });
  }
  return out;
}
