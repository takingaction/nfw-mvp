import { NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminCheck";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;

const SELECT_COLUMNS =
  "id, full_name, email, membership_level, subscription_status, date_of_birth, state, city, household_income, subscription_ends_at, joined_at, is_admin, is_reviewer, access_perks_synced_at, profile_completed, is_approved_free_member, free_membership_contact_submitted, previous_membership_level";

/**
 * GET /api/admin/members/list
 *
 * Returns ALL profiles for the admin members page (client-side search).
 * Uses the service-role client so the result does not depend on the browser
 * Supabase client having a readable session (profiles RLS is admin/own-row
 * only since migration 159).
 */
export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getAdminClient();
  const members: Record<string, unknown>[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("profiles")
      .select(SELECT_COLUMNS)
      .order("joined_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("[admin/members/list] Error fetching profiles:", error);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    if (data && data.length > 0) {
      members.push(...data);
      page++;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return NextResponse.json({ members, total: members.length });
}
