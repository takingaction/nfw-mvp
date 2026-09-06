import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Admin auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all profile IDs that are in stripe_backfill_status (with pagination to bypass PostgREST max-rows cap)
    const backfillProfileIds = new Set<string>();
    let bpPage = 0;
    const bpPageSize = 1000;
    let bpHasMore = true;

    while (bpHasMore) {
      const { data: backfillBatch } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select("profile_id")
        .not("profile_id", "is", null)
        .range(bpPage * bpPageSize, (bpPage + 1) * bpPageSize - 1);

      if (backfillBatch && backfillBatch.length > 0) {
        backfillBatch.forEach(r => { if (r.profile_id) backfillProfileIds.add(r.profile_id); });
        bpPage++;
        bpHasMore = backfillBatch.length === bpPageSize;
      } else {
        bpHasMore = false;
      }
    }

    // Get all profiles NOT in stripe_backfill_status - with pagination
    const allProfiles: any[] = [];
    let pPage = 0;
    const pPageSize = 1000;
    let pHasMore = true;

    while (pHasMore) {
      const { data: profileBatch, error } = await supabaseAdmin
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          membership_level,
          stripe_customer_id,
          joined_at
        `)
        .not("email", "is", null)
        .order("joined_at", { ascending: false })
        .range(pPage * pPageSize, (pPage + 1) * pPageSize - 1);

      if (error) {
        console.error("[missing-from-backfill] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (profileBatch && profileBatch.length > 0) {
        allProfiles.push(...profileBatch);
        pPage++;
        pHasMore = profileBatch.length === pPageSize;
      } else {
        pHasMore = false;
      }
    }

    // Filter to only profiles NOT in backfill
    const missing = allProfiles.filter(p => !backfillProfileIds.has(p.id));

    return NextResponse.json({
      success: true,
      count: missing.length,
      profiles: missing.map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        membership_level: p.membership_level,
        stripe_customer_id: p.stripe_customer_id,
        joined_at: p.joined_at,
        has_stripe_id: !!p.stripe_customer_id,
        stripeDashboardUrl: p.stripe_customer_id
          ? `https://dashboard.stripe.com/customers/${p.stripe_customer_id}`
          : null,
      })),
    });

  } catch (error) {
    console.error("[missing-from-backfill] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
