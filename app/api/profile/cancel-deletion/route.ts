import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user's pending deletion request
    const { data: existingRequest } = await supabase
      .from("deletion_requests")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "verified"])
      .single();

    if (!existingRequest) {
      return NextResponse.json(
        { error: "No pending deletion request found" },
        { status: 404 }
      );
    }

    // Cancel the request
    const { error: cancelError } = await supabase
      .from("deletion_requests")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
      })
      .eq("id", existingRequest.id);

    if (cancelError) {
      console.error("[cancel-deletion] Cancel error:", cancelError);
      return NextResponse.json(
        { error: "Failed to cancel deletion request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Deletion request cancelled successfully",
    });
  } catch (error: any) {
    console.error("[cancel-deletion] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
