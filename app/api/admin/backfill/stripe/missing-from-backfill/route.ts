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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all profile IDs that are in stripe_backfill_status
    const { data: backfillProfiles } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("profile_id")
      .not("profile_id", "is", null);

    const backfillProfileIds = new Set(
      (backfillProfiles || []).map(r => r.profile_id).filter(Boolean)
    );

    // Get all paid profiles
    const { data: paidProfiles, error } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        membership_level,
        stripe_customer_id,
        joined_at
      `)
      .in("membership_level", ["contributing", "founding"])
      .eq("profile_completed", true)
      .neq("is_admin", true)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("[missing-from-backfill] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to only profiles NOT in backfill
    const missing = (paidProfiles || []).filter(p => !backfillProfileIds.has(p.id));

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
