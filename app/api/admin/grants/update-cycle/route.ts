import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
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

    const {
      cycleId,
      cycle_name,
      description,
      start_date,
      end_date,
      amount_per_grant,
      grants_available,
      status,
      featured_image,
      is_testing_only,
      requires_documents,
      rejection_body,
      selection_method,
    } = await request.json();

    if (!cycleId)
      return NextResponse.json({ error: "Missing cycleId" }, { status: 400 });

    if (selection_method !== undefined) {
      if (selection_method !== "scored" && selection_method !== "random") {
        return NextResponse.json({ error: "Invalid selection method" }, { status: 400 });
      }
      const { data: current } = await supabaseAdmin
        .from("grant_cycles")
        .select("selection_method, final_approved_at")
        .eq("id", cycleId)
        .single();
      if (current && current.selection_method !== selection_method && current.final_approved_at) {
        return NextResponse.json(
          { error: "Selection method can't be changed after the cycle is finalized." },
          { status: 400 },
        );
      }
    }

    const total_funds =
      parseFloat(amount_per_grant) * parseInt(grants_available);

    const { error } = await supabaseAdmin
      .from("grant_cycles")
      .update({
        cycle_name,
        description,
        start_date,
        end_date,
        amount_per_grant: parseFloat(amount_per_grant),
        grants_available: parseInt(grants_available),
        total_funds,
        status,
        featured_image,
        is_testing_only,
        requires_documents,
        selection_method,
        rejection_body: Array.isArray(rejection_body) ? rejection_body : [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", cycleId);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
