import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";
import { checkDeletionEligibility } from "@/lib/deletion-eligibility";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const adminUserId = admin.user?.id;

    // Fetch the deletion request
    const { data: deletionRequest, error: requestError } = await supabaseAdmin
      .from("deletion_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (requestError || !deletionRequest) {
      return NextResponse.json(
        { error: "Deletion request not found" },
        { status: 404 }
      );
    }

    if (deletionRequest.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot verify request in ${deletionRequest.status} status` },
        { status: 400 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("membership_level, subscription_status")
      .eq("id", deletionRequest.user_id)
      .maybeSingle();

    const eligibility = await checkDeletionEligibility(deletionRequest.user_id);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: eligibility.blocks.map((b) => b.adminMessage).join(" "),
          blocks: eligibility.blocks.map((b) => b.code),
          financialHold: eligibility.blocks.some((b) => b.code === "renewing_subscription"),
          pendingGrants: eligibility.blocks.some((b) => b.code === "pending_grants"),
        },
        { status: 400 }
      );
    }

    // Update request status to verified
    const { error: updateError } = await supabaseAdmin
      .from("deletion_requests")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: adminUserId,
      })
      .eq("id", id);

    if (updateError) {
      console.error("[verify] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to verify deletion request" },
        { status: 500 }
      );
    }

    // Log the verification
    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: id,
      user_id: deletionRequest.user_id,
      action: "verify",
      table_name: "deletion_requests",
      record_identifier: id,
      details: {
        verified_by: adminUserId,
        membership_level: profile?.membership_level ?? null,
        subscription_status: profile?.subscription_status ?? null,
        billable_subscriptions: eligibility.billableSubscriptions,
        eligibility_used_db_fallback: eligibility.usedFallback,
      },
      performed_by: adminUserId,
    });

    return NextResponse.json({
      success: true,
      message: "Deletion request verified successfully",
    });
  } catch (error: any) {
    console.error("[admin/deletion-requests/[id]/verify] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
