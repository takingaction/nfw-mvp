import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendBankInfoRequestEmail } from "@/lib/email";

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

    const { grantId } = await request.json();

    if (!grantId) {
      return NextResponse.json({ error: "Grant ID required" }, { status: 400 });
    }

    // DEBUG: Log the grantId
    console.log("[send-bank-info-email] Received grantId:", grantId);

    // Get grant data with nominee info
    // Note: profiles has two FK relationships (user_id and reviewed_by), so we use the explicit one
    const { data: grant, error: grantError } = await supabaseAdmin
      .from("grants")
      .select("*, grant_cycles(cycle_name), profiles!grants_user_id_fkey(full_name)")
      .eq("id", grantId)
      .single();

    // DEBUG: Log query result
    console.log("[send-bank-info-email] Query result:", { grant, grantError });

    if (!grant) {
      if (grantError) {
        console.error("[send-bank-info-email] Grant query error:", grantError);
      }
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }

    // Determine who to email
    let emailTo: string;
    let recipientName: string;
    let isNominee = false;

    if (grant.is_nominating && grant.nominee_email) {
      // Nomination - email the nominee
      emailTo = grant.nominee_email;
      recipientName = grant.nominee_name || "Nominee";
      isNominee = true;
    } else {
      // Self application - get user's email from auth.users
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(grant.user_id);
      if (!userData?.user?.email) {
        return NextResponse.json(
          { error: "Could not find applicant email" },
          { status: 400 }
        );
      }
      emailTo = userData.user.email;
      recipientName = (grant.profiles as { full_name?: string })?.full_name || "Applicant";
      isNominee = false;
    }

    // Check if stripe already connected
    if (grant.stripe_connect_account_id) {
      return NextResponse.json(
        { error: "Bank account already connected" },
        { status: 400 }
      );
    }

    // Send the email
    try {
      await sendBankInfoRequestEmail({
        to: emailTo,
        name: recipientName,
        grantCycleName: (grant.grant_cycles as { cycle_name?: string })?.cycle_name || "NFW Microgrant",
        amountApproved: grant.amount_approved,
        isNominee,
      });
    } catch (emailErr) {
      console.error("[send-bank-info-email] Email send error:", emailErr);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    console.error("Error sending bank info email:",);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
