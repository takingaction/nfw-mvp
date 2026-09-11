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

    // Check if user already has a pending deletion request
    const { data: existingRequest } = await supabase
      .from("deletion_requests")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "verified"])
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending deletion request" },
        { status: 400 }
      );
    }

    // Check for active subscription (block deletion if active)
    const { data: profile } = await supabase
      .from("profiles")
      .select("membership_level, subscription_status")
      .eq("id", user.id)
      .single();

    if (
      profile?.membership_level === "contributing" ||
      profile?.membership_level === "founding"
    ) {
      if (profile?.subscription_status === "active") {
        return NextResponse.json(
          { error: "Cannot delete account with active subscription. Please cancel your subscription first." },
          { status: 400 }
        );
      }
    }

    // Check for pending grant applications
    const { data: pendingGrants } = await supabase
      .from("grants")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["submitted", "in_review"])
      .limit(1);

    if (pendingGrants && pendingGrants.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete account with pending grant applications. Please wait until they are processed." },
        { status: 400 }
      );
    }

    // Get user email
    const { data: authUser } = await supabase.auth.getUser();
    const email = authUser.user?.email || "";

    // Create deletion request
    const { data: newRequest, error: createError } = await supabase
      .from("deletion_requests")
      .insert({
        user_id: user.id,
        email,
        status: "pending",
      })
      .select("id")
      .single();

    if (createError) {
      console.error("[request-deletion] Create error:", createError);
      return NextResponse.json(
        { error: "Failed to create deletion request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
      message: "Deletion request submitted successfully",
    });
  } catch (error: any) {
    console.error("[request-deletion] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: requests, error } = await supabase
      .from("deletion_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[request-deletion] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch deletion request" },
        { status: 500 }
      );
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ hasRequest: false });
    }

    return NextResponse.json({
      hasRequest: true,
      request: requests[0],
    });
  } catch (error: any) {
    console.error("[request-deletion] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
