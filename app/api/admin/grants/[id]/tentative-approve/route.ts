import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

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

    // Check if user is admin (reviewers cannot modify approvals)
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: cycleId } = await params;
    const body = await request.json();

    const { grantIds } = body; // Array of grant IDs to tentatively approve

    if (!Array.isArray(grantIds)) {
      return NextResponse.json({ error: "grantIds must be an array" }, { status: 400 });
    }

    // Get cycle info
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("grants_available")
      .eq("id", cycleId)
      .single();

    // Check if selection exceeds available grants
    if (grantIds.length > (cycle?.grants_available || 0)) {
      return NextResponse.json({
        error: `Cannot select more than ${cycle?.grants_available} grants`,
      }, { status: 400 });
    }

    // Get all grants with their combined scores for this cycle
    const { data: grants } = await supabaseAdmin
      .from("grants")
      .select(`
        id,
        grant_scores (reviewer_name, total_score)
      `)
      .eq("cycle_id", cycleId);

    // Calculate combined scores
    const grantScores = new Map();
    grants?.forEach((g) => {
      const firstTotal = g.grant_scores?.find((s: any) => s.reviewer_name === "first")?.total_score || 0;
      const secondTotal = g.grant_scores?.find((s: any) => s.reviewer_name === "second")?.total_score || 0;
      grantScores.set(g.id, firstTotal + secondTotal);
    });

    // Delete existing tentative approvals for this cycle
    await supabaseAdmin
      .from("grant_tentative_approvals")
      .delete()
      .eq("cycle_id", cycleId);

    // Insert new tentative approvals
    const tentativeApprovals = grantIds.map((grantId) => ({
      grant_id: grantId,
      cycle_id: cycleId,
      combined_score: grantScores.get(grantId) || 0,
      is_approved: true,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from("grant_tentative_approvals")
      .insert(tentativeApprovals);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: grantIds.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
