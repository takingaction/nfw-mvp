import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import { loadMemberReconciliation } from "@/lib/stripe-member-reconciliation-data";

/**
 * POST: for paid members matched to their active Stripe subscription by email
 * only, save that subscription's customer id on the profile.
 *
 * Only fills an empty stripe_customer_id. Members whose saved id differs from
 * the active subscription's customer are left alone and reported, since an
 * admin should decide which customer is right.
 */
export const maxDuration = 60;

export async function POST() {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = getAdminClient();
  const loaded = await loadMemberReconciliation(supabase);
  if (!loaded) {
    return NextResponse.json({ error: "No Stripe snapshot yet. Refresh from Stripe first." }, { status: 503 });
  }

  const rows = loaded.result.rows.filter((r) => r.reason === "linked_by_email_only" && r.profile_id && r.stripe_customer_id);

  // Which profiles have no saved id (vs a different one)?
  const ids = rows.map((r) => r.profile_id!);
  const savedById = new Map<string, string | null>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.from("profiles").select("id, stripe_customer_id").in("id", ids.slice(i, i + 100));
    if (error) return NextResponse.json({ error: "Failed to read profiles" }, { status: 500 });
    for (const p of data ?? []) savedById.set(p.id, p.stripe_customer_id);
  }

  // A customer id already saved on another profile would make two profiles
  // claim one customer; skip those too.
  const customerIds = rows.map((r) => r.stripe_customer_id!);
  const takenCustomers = new Set<string>();
  for (let i = 0; i < customerIds.length; i += 100) {
    const { data } = await supabase.from("profiles").select("stripe_customer_id").in("stripe_customer_id", customerIds.slice(i, i + 100));
    for (const p of data ?? []) if (p.stripe_customer_id) takenCustomers.add(p.stripe_customer_id);
  }

  let saved = 0;
  let skippedDifferent = 0;
  let skippedTaken = 0;
  for (const r of rows) {
    if (savedById.get(r.profile_id!)) {
      skippedDifferent++;
      continue;
    }
    if (takenCustomers.has(r.stripe_customer_id!)) {
      skippedTaken++;
      continue;
    }
    const { data, error } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: r.stripe_customer_id, updated_at: new Date().toISOString() })
      .eq("id", r.profile_id!)
      .is("stripe_customer_id", null)
      .select("id");
    if (error) {
      console.error("[repair/save-customer-ids] update failed for", r.profile_id, error);
      continue;
    }
    if (data && data.length > 0) {
      saved++;
      takenCustomers.add(r.stripe_customer_id!);
    }
  }

  console.log(
    `[repair/save-customer-ids] ${admin.user?.email ?? admin.user?.id}: saved ${saved}, skipped ${skippedDifferent} (different id saved), ${skippedTaken} (customer on another profile)`,
  );
  return NextResponse.json({ ok: true, saved, skippedDifferent, skippedTaken });
}
