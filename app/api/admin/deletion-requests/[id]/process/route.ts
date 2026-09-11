import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";
import { anonymizeUser } from "@/lib/anonymize";

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

    if (deletionRequest.status !== "verified") {
      return NextResponse.json(
        { error: "Request must be verified before processing" },
        { status: 400 }
      );
    }

    // Perform the anonymization
    const result = await anonymizeUser(
      deletionRequest.user_id,
      id,
      adminUserId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Anonymization failed" },
        { status: 500 }
      );
    }

    // Update request status to processed
    const { error: updateError } = await supabaseAdmin
      .from("deletion_requests")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        processed_by: adminUserId,
      })
      .eq("id", id);

    if (updateError) {
      console.error("[process] Update error:", updateError);
      // Anonymization succeeded but status update failed
      return NextResponse.json(
        {
          success: true,
          warning: "Anonymization completed but status update failed",
          details: result.details,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account anonymized successfully",
      details: result.details,
    });
  } catch (error: any) {
    console.error("[admin/deletion-requests/[id]/process] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
