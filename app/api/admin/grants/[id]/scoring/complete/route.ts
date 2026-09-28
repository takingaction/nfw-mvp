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

    // Check if user is admin or reviewer
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, is_reviewer")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_reviewer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: cycleId } = await params;

    // Load every grant in the cycle with its embedded scores, paged 1000 at a
    // time. Do NOT use `.in("grant_id", ids)` here: with hundreds of grants the
    // UUID list overflows the request URL, the query fails, and (previously)
    // every grant was reported as unscored.
    const PAGE_SIZE = 1000;
    const grants: Array<{
      id: string;
      ai_invalidated_at: string | null;
      grant_scores: Array<{ reviewer_name: string; is_complete: boolean | null }> | null;
    }> = [];
    for (let page = 0; ; page++) {
      const from = page * PAGE_SIZE;
      const { data, error } = await supabaseAdmin
        .from("grants")
        .select("id, ai_invalidated_at, grant_scores!left(reviewer_name, is_complete)")
        .eq("cycle_id", cycleId)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error("[scoring/complete] Failed to load grants:", error);
        return NextResponse.json(
          { error: `Failed to load applications: ${error.message}` },
          { status: 500 },
        );
      }
      if (!data || data.length === 0) break;
      grants.push(...(data as typeof grants));
      if (data.length < PAGE_SIZE) break;
    }

    if (grants.length === 0) {
      return NextResponse.json({ error: "No grants found" }, { status: 404 });
    }

    // An application is done if the first reviewer's score is complete, or it
    // was skipped ("Skip & Mark Invalid") — skipped grants have locked score
    // inputs and are auto-rejected at finalization.
    const isDone = (g: (typeof grants)[number]) =>
      !!g.ai_invalidated_at ||
      (g.grant_scores ?? []).some(
        (s) => s.reviewer_name === "first" && s.is_complete === true,
      );

    const incompleteCount = grants.filter((g) => !isDone(g)).length;

    if (incompleteCount > 0) {
      return NextResponse.json({
        error: `${incompleteCount} application(s) have not been scored yet`,
        incomplete_count: incompleteCount,
      }, { status: 400 });
    }

    // Set rachel_complete = true on ALL grants in this cycle
    const { error: updateError } = await supabaseAdmin
      .from("grants")
      .update({ rachel_complete: true })
      .eq("cycle_id", cycleId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
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
