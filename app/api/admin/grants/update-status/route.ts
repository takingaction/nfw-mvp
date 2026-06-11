import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const VALID_STATUSES = [
  "submitted",
  "in_review",
  "approved",
  "not_approved",
  "payment_pending",
  "payment_sent",
];

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

    const { grantId, status, amount_approved, admin_notes } =
      await request.json();

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { status };
    if (amount_approved !== undefined)
      updates.amount_approved = amount_approved;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (status === "approved") {
      updates.reviewed_at = new Date().toISOString();
      updates.reviewed_by = user.id;
    }
    if (status === "payment_sent") updates.funded_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("grants")
      .update(updates)
      .eq("id", grantId);

    if (error)
      return NextResponse.json(
        { error: "Failed to update grant status" },
        { status: 500 },
      );

    // TEMPORARILY DISABLED: Status update emails
    // Re-enable by uncommenting this block when ready to send automatic status emails
    //
    // const { data: grantData } = await supabaseAdmin
    //   .from("grants")
    //   .select("user_id, grant_cycles(cycle_name)")
    //   .eq("id", grantId)
    //   .single();
    //
    // if (grantData) {
    //   const { data: profile } = await supabaseAdmin
    //     .from("profiles")
    //     .select("full_name")
    //     .eq("id", grantData.user_id)
    //     .single();
    //
    //   const { data: userData } = await supabaseAdmin.auth.admin.getUserById(grantData.user_id);
    //   const userEmail = userData?.user?.email;
    //
    //   if (userEmail) {
    //     const { sendGrantStatusEmail } = await import("@/lib/email");
    //     await sendGrantStatusEmail({
    //       to: userEmail,
    //       name: profile?.full_name || "Member",
    //       status,
    //       grantCycleName:
    //         (grantData.grant_cycles as any)?.cycle_name || "NFW Microgrant",
    //       amountApproved: amount_approved,
    //     });
    //   }
    // }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 },
    );
  }
}
