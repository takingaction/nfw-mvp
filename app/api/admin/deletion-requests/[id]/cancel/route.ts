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

    if (deletionRequest.status === "processed") {
      return NextResponse.json(
        { error: "Cannot cancel a processed deletion request" },
        { status: 400 }
      );
    }

    // Update request status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from("deletion_requests")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: adminUserId,
      })
      .eq("id", id);

    if (updateError) {
      console.error("[cancel] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel deletion request" },
        { status: 500 }
      );
    }

    // Log the cancellation
    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: id,
      user_id: deletionRequest.user_id,
      action: "admin_cancel",
      table_name: "deletion_requests",
      record_identifier: id,
      details: {
        cancelled_by: adminUserId,
      },
      performed_by: adminUserId,
    });

    return NextResponse.json({
      success: true,
      message: "Deletion request cancelled successfully",
    });
  } catch (error: any) {
    console.error("[admin/deletion-requests/[id]/cancel] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
