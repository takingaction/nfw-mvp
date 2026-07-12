import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendSecondReviewerNotification } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(
  request: Request,
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

    const { id: cycleId } = await params;

    // Check if first scoring is complete for all grants
    const { data: grants } = await supabaseAdmin
      .from("grants")
      .select("id, rachel_complete")
      .eq("cycle_id", cycleId);

    if (!grants || grants.length === 0) {
      return NextResponse.json({ error: "No grants found" }, { status: 404 });
    }

    // Check if all grants have rachel_complete = true
    const incomplete = grants.filter((g) => g.rachel_complete !== true);
    if (incomplete.length > 0) {
      return NextResponse.json({
        error: `${incomplete.length} application(s) have not been scored yet`,
        incomplete_count: incomplete.length,
      }, { status: 400 });
    }

    // Update cycle scoring_completed_at
    const { error: cycleError } = await supabaseAdmin
      .from("grant_cycles")
      .update({ scoring_completed_at: new Date().toISOString() })
      .eq("id", cycleId);

    if (cycleError) {
      return NextResponse.json({ error: cycleError.message }, { status: 500 });
    }

    // Get cycle name for email
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("cycle_name")
      .eq("id", cycleId)
      .single();

    // Send notification email to Michelle
    await sendSecondReviewerNotification({
      cycleName: cycle?.cycle_name || "Grant Review",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
