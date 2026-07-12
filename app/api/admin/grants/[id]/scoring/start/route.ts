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

    const { id: cycleId } = await params;

    // Check if scoring has already started
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("scoring_started_at")
      .eq("id", cycleId)
      .single();

    if (cycle?.scoring_started_at) {
      return NextResponse.json({
        error: "Scoring has already started",
        scoring_started_at: cycle.scoring_started_at,
      }, { status: 400 });
    }

    // Set scoring_started_at
    const { error } = await supabaseAdmin
      .from("grant_cycles")
      .update({ scoring_started_at: new Date().toISOString() })
      .eq("id", cycleId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
