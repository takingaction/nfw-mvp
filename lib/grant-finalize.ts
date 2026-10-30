/**
 * Pure helpers for app/api/admin/grants/[id]/final-approve (tested in
 * lib/grant-finalize.test.ts).
 *
 * Finalizing a cycle has two phases:
 *   1. decide — write approved / not_approved statuses, stamp final_approved_at
 *   2. notify — email every applicant once
 * Phase 2 is resumable: a grant counts as emailed when grant_email_log holds a
 * delivered-ish row for it ("sent", or "already_sent" from the Resend CSV
 * backfill). Anyone without one is still pending.
 */

export type FinalizeEmailType = "approved" | "rejected";

/** Log statuses that mean "this person has been emailed". */
export const EMAILED_LOG_STATUSES = ["sent", "already_sent"] as const;

export interface EmailLogRow {
  grant_id: string;
  email_type: string;
  status: string;
}

export function emailedKey(type: FinalizeEmailType, grantId: string): string {
  return `${type}:${grantId}`;
}

/** Set of `${type}:${grantId}` for every grant already emailed. */
export function emailedSet(logs: EmailLogRow[]): Set<string> {
  const emailed = new Set<string>();
  for (const l of logs) {
    if ((EMAILED_LOG_STATUSES as readonly string[]).includes(l.status) &&
        (l.email_type === "approved" || l.email_type === "rejected")) {
      emailed.add(emailedKey(l.email_type, l.grant_id));
    }
  }
  return emailed;
}

/**
 * Grants still owed an email of `type`, sorted by id. The stable order keeps
 * batch chunks — and therefore Resend idempotency keys — identical across
 * re-runs, so a chunk that went out but was never logged is deduplicated by
 * Resend rather than sent twice.
 */
export function pendingFor<T extends { id: string }>(
  grants: T[],
  type: FinalizeEmailType,
  emailed: Set<string>,
): T[] {
  return grants
    .filter((g) => !emailed.has(emailedKey(type, g.id)))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Split ids into chunks small enough for a PostgREST `.in()` filter. */
export function idChunks(ids: string[], size = 150): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}
