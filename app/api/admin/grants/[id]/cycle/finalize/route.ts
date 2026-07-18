import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ALLOWED_EMAILS = [
  "rachel@nationalfundforwomen.org",
  "michelle@nationalfundforwomen.org",
  "kelsey@nationalfundforwomen.org",
  "ron@myherodesign.com",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_EMAILS.includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: cycleId } = await params;
    const body = await request.json();
    const { is_finalized } = body;

    console.log("[Finalize API] cycleId:", cycleId, "is_finalized:", is_finalized);

    if (typeof is_finalized !== "boolean") {
      return NextResponse.json(
        { error: "is_finalized must be a boolean" },
        { status: 400 }
      );
    }

    const { data: cycle, error: cycleError } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, cycle_name, is_finalized")
      .eq("id", cycleId)
      .single();

    console.log("[Finalize API] cycle lookup:", { cycle, cycleError });

    if (cycleError || !cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("grant_cycles")
      .update({ is_finalized })
      .eq("id", cycleId);

    console.log("[Finalize API] update result:", { updateError });

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update cycle: ${updateError.message}` },
        { status: 500 }
      );
    }

    const action = is_finalized ? "finalized" : "unfinalized";
    console.log("[Finalize API] success!");
    return NextResponse.json({
      success: true,
      message: `Cycle ${action} successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
