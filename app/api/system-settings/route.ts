import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_SETTINGS_ID = "00000000-0000-0000-0000-000000000002";

export async function GET() {
  try {
    console.log("GET /api/system-settings called");
    const supabase = await createClient();

    console.log("About to query system_settings...");
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .eq("id", SYSTEM_SETTINGS_ID)
      .single();

    console.log("Query result:", { data, error });
    
    if (error) {
      console.error("Error fetching system settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch system settings", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Unexpected error in GET /api/system-settings:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log("POST /api/system-settings called");
    const supabase = await createClient();

    // Authenticate admin
    const { data: { user } } = await supabase.auth.getUser();
    console.log("User from session:", user?.id);
    
    if (!user) {
      console.log("No user found, returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    console.log("Profile is_admin:", profile?.is_admin);

    if (!profile?.is_admin) {
      console.log("Not admin, returning 403");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    console.log("Body:", body);
    const {
      shopify_checkout_enabled,
    } = body;

    // Build updates object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof shopify_checkout_enabled === "boolean") {
      updates.shopify_checkout_enabled = shopify_checkout_enabled;
    }
    console.log("Updates:", updates);

    const { data, error } = await supabase
      .from("system_settings")
      .update(updates)
      .eq("id", SYSTEM_SETTINGS_ID)
      .select()
      .single();

    if (error) {
      console.error("Error updating system settings:", error);
      return NextResponse.json(
        { error: "Failed to update system settings" },
        { status: 500 }
      );
    }
    console.log("Update success, data:", data);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Unexpected error in POST /api/system-settings:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
