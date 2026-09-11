import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

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
      .order("created_at", { ascending: true });

    // Fetch documents pending review for this request
    const { data: pendingDocuments, error: docsError } = await supabaseAdmin
      .from("deletion_documents_pending")
      .select("*")
      .eq("deletion_request_id", id);

    // Check for active subscription info
    let financialHold = null;
    if (deletionRequest.profile) {
      const profile = deletionRequest.profile;
      if (
        profile.membership_level === "contributing" ||
        profile.membership_level === "founding"
      ) {
        if (profile.subscription_status === "active") {
          financialHold = {
            type: "active_subscription",
            message: `Active ${profile.membership_level} membership (${profile.subscription_status})`,
            ends_at: profile.subscription_ends_at,
          };
        }
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
      pendingDocuments: pendingDocuments || [],
      financialHold,
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
