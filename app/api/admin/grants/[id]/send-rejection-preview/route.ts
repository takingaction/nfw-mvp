import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getPreRenderedHtmlAdmin } from "@/lib/email-blocks/publish";
import { sendEmailBySlug } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: cycleId } = await params;

    const body = await request.json();
    const { applicantGrantId, recipientEmail } = body || {};

    if (!applicantGrantId) {
      return NextResponse.json(
        { error: "Missing applicantGrantId" },
        { status: 400 },
      );
    }

    if (
      !recipientEmail ||
      typeof recipientEmail !== "string" ||
      !recipientEmail.includes("@")
    ) {
      return NextResponse.json(
        { error: "Valid recipientEmail required" },
        { status: 400 },
      );
    }

    // Load the cycle (live values for rejection_message, etc.)
    const { data: cycle, error: cycleError } = await supabaseAdmin
      .from("grant_cycles")
      .select(
        "id, cycle_name, rejection_message, rejection_message_1, rejection_message_2, rejection_message_3",
      )
      .eq("id", cycleId)
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json(
        { error: "Cycle not found" },
        { status: 404 },
      );
    }

    // Load the applicant grant + profile. Defense against URL-tampering:
    // confirm the grant belongs to the requested cycle.
    const { data: applicantGrant, error: applicantError } = await supabaseAdmin
      .from("grants")
      .select("id, cycle_id, profiles:user_id(full_name, email)")
      .eq("id", applicantGrantId)
      .single();

    if (applicantError || !applicantGrant) {
      return NextResponse.json(
        { error: "Applicant grant not found" },
        { status: 404 },
      );
    }

    if (applicantGrant.cycle_id !== cycleId) {
      return NextResponse.json(
        { error: "Applicant grant does not belong to this cycle" },
        { status: 400 },
      );
    }

    const applicantProfile = Array.isArray(applicantGrant.profiles)
      ? applicantGrant.profiles[0]
      : applicantGrant.profiles;

    const applicantName = applicantProfile?.full_name || "there";

    // Build variables map identical to final-approve/route.ts:202-208.
    const variables = {
      grantCycleName: cycle.cycle_name,
      rejectionMessage: cycle.rejection_message || "",
      rejectionMessage1: cycle.rejection_message_1 || "",
      rejectionMessage2: cycle.rejection_message_2 || "",
      rejectionMessage3: cycle.rejection_message_3 || "",
      ctaUrl: "https://nationalfundforwomen.org/grants/my-applications",
    };

    // Compute the rendered subject so we can return it to the modal AND so
    // the recipient sees the same subject the live path produces. Re-using
    // getPreRenderedHtmlAdmin ensures consistency with what real applicants
    // will receive during Finalize Approvals.
    const preRendered = await getPreRenderedHtmlAdmin(
      "grant-not-approved",
      variables,
      { skipActiveCheck: true },
    );

    const subject = preRendered?.subject || "";

    // Send via the same function final-approve uses. Post-5619387 this routes
    // through substituteAndTranslate which correctly translates markdown in
    // variable values (e.g. [here](url) → <a>).
    const result = await sendEmailBySlug("grant-not-approved", {
      to: recipientEmail,
      name: applicantName,
      variables,
      errorContext: "send-rejection-preview",
      skipActiveCheck: true,
    });

    if (!result.success) {
      console.error(
        `[send-rejection-preview] sendEmailBySlug failed for ${recipientEmail}:`,
        result.error,
      );
      return NextResponse.json(
        {
          error: result.error || "Failed to send email",
          subject,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      sentTo: recipientEmail,
      applicantName,
      applicantGrantId,
      subject,
      resendId: result.resendId,
    });
  } catch (err: any) {
    console.error("[send-rejection-preview] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
