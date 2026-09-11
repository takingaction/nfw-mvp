import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

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

    // Verify the user exists and has no active subscriptions
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(
        "membership_level, subscription_status, subscription_ends_at, is_admin"
      )
      .eq("id", deletionRequest.user_id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }

    // Check for active subscription
    if (
      (profile.membership_level === "contributing" ||
        profile.membership_level === "founding") &&
      profile.subscription_status === "active"
    ) {
      return NextResponse.json(
        {
          error: "User has an active subscription. Please ensure subscription is cancelled first.",
          financialHold: true,
        },
        { status: 400 }
      );
    }

    // Check for pending grants
    const { data: pendingGrants } = await supabaseAdmin
      .from("grants")
      .select("id")
      .eq("user_id", deletionRequest.user_id)
      .in("status", ["submitted", "in_review"])
      .limit(1);

    if (pendingGrants && pendingGrants.length > 0) {
      return NextResponse.json(
        {
          error: "User has pending grant applications. Please wait until they are processed.",
          pendingGrants: true,
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
        membership_level: profile.membership_level,
        subscription_status: profile.subscription_status,
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
