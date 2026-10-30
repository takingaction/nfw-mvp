import type { SupabaseClient } from "@supabase/supabase-js";
import { EMAILED_LOG_STATUSES, emailedSet } from "@/lib/grant-finalize";
import { fetchAllPagesIn } from "@/lib/supabase-paginate";

/**
 * `${type}:${grantId}` for every grant in these cycles that has been emailed
 * (a `sent` or `already_sent` row). Pair with outstandingFailures() so retry
 * tools never re-send to someone whose earlier failure was already fixed.
 */
export async function loadEmailedKeys(
  admin: SupabaseClient,
  cycleIds: string[],
): Promise<{ emailed: Set<string>; error: string | null }> {
  if (cycleIds.length === 0) return { emailed: new Set(), error: null };
  const { data, error } = await fetchAllPagesIn<{ grant_id: string; email_type: string; status: string }>(
    cycleIds,
    (chunk, from, to) =>
      admin
        .from("grant_email_log")
        .select("grant_id, email_type, status")
        .in("cycle_id", chunk)
        .in("status", [...EMAILED_LOG_STATUSES])
        .order("id", { ascending: true })
        .range(from, to),
  );
  if (error) return { emailed: new Set(), error: error.message };
  return { emailed: emailedSet(data), error: null };
}
