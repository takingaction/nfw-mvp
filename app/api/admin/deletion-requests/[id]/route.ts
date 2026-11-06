import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";
import { checkDeletionEligibility } from "@/lib/deletion-eligibility";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch deletion request with profile
    const { data: deletionRequest, error: requestError } = await supabaseAdmin
      .from("deletion_requests")
      .select(`
        *,
        profile:profiles!deletion_requests_user_id_fkey(
          id,
          full_name,
          email,
          membership_level,
          subscription_status,
          subscription_ends_at,
          joined_at,
          is_admin
        )
      `)
      .eq("id", id)
      .single();

    if (requestError || !deletionRequest) {
      return NextResponse.json(
        { error: "Deletion request not found" },
        { status: 404 }
      );
    }

    // Fetch deletion log for this request
    const { data: logs, error: logsError } = await supabaseAdmin
      .from("deletion_log")
      .select("*")
      .eq("deletion_request_id", id)
      .order("performed_at", { ascending: true });

    // Live eligibility (Stripe-backed) for open requests only.
    let financialHold = null;
    let billableSubscriptions: { id: string; status: string; scheduledCancelAt: string | null }[] = [];
    if (["pending", "verified"].includes(deletionRequest.status)) {
      const eligibility = await checkDeletionEligibility(deletionRequest.user_id);
      billableSubscriptions = eligibility.billableSubscriptions;
      const renewing = eligibility.blocks.find((b) => b.code === "renewing_subscription");
      if (renewing) {
        financialHold = {
          type: "renewing_subscription",
          message: renewing.adminMessage,
          ends_at: deletionRequest.profile?.subscription_ends_at ?? null,
        };
      }
    }

    // Check for pending grants
    const { data: pendingGrants } = await supabaseAdmin
      .from("grants")
      .select("id, status, grant_cycles(cycle_name)")
      .eq("user_id", deletionRequest.user_id)
      .in("status", ["submitted", "in_review"]);

    return NextResponse.json({
      request: deletionRequest,
      logs: logs || [],
      financialHold,
      billableSubscriptions,
      pendingGrants: pendingGrants || [],
    });
  } catch (error: any) {
    console.error("[admin/deletion-requests/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
