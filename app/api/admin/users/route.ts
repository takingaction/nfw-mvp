import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: users, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("is_admin", true)
      .order("full_name", { ascending: true });

    console.log("[Admin Users API] Users found:", users?.length, "Error:", error);
    if (error) throw error;

    // If no admin users found, return empty array
    // The calling code should handle this case
    return NextResponse.json(users || []);
  } catch (err) {
    console.error("[Admin Users API] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
