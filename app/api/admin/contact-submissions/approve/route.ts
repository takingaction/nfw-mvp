import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/email";

const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { submissionId } = await request.json();

    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    // Get the contact submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("contact_submissions")
      .select("id, email, name, subject_label")
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission) {
      console.error("[approve/free-membership] Submission not found:", submissionId, submissionError);
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify it's a free membership request
    if (submission.subject_label !== "Free Membership Request") {
      console.warn("[approve/free-membership] Not a free membership request:", submission.subject_label);
      return NextResponse.json({ error: "Not a free membership request" }, { status: 400 });
    }

    console.log("[approve/free-membership] Processing approval for:", submission.email, submission.name);

    // Look up profile by email (primary method since contact_submissions doesn't have user_id)
    let profile = null;

    if (submission.email) {
      const { data: profileByEmail } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, membership_level, is_approved_free_member")
        .eq("email", submission.email)
        .single();

      if (profileByEmail) {
        profile = profileByEmail;
        console.log("[approve/free-membership] Profile found:", profile.id, "membership:", profile.membership_level);
      }
    }

    if (!profile) {
      console.error("[approve/free-membership] No matching profile found for email:", submission.email);
      return NextResponse.json({ error: "No matching profile found" }, { status: 404 });
    }

    // Check if already approved
    if (profile.is_approved_free_member === true) {
      console.warn("[approve/free-membership] Already approved:", profile.id);
      return NextResponse.json({ error: "Already approved" }, { status: 400 });
    }

    // Check if still free member (hasn't upgraded to paid)
    if (profile.membership_level !== "free") {
      console.warn("[approve/free-membership] User is no longer free:", profile.id, "level:", profile.membership_level);
      return NextResponse.json({ error: "User is no longer a free member" }, { status: 400 });
    }

    // Approve the free membership
    console.log("[approve/free-membership] Approving profile:", profile.id);
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ is_approved_free_member: true })
      .eq("id", profile.id);

    if (updateError) {
      console.error("[approve/free-membership] Failed to update profile:", profile.id, updateError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    console.log("[approve/free-membership] Profile approved, sending welcome email to:", profile.email);

    // Send welcome email
    let emailError = null;
    try {
      await sendWelcomeEmail({
        to: profile.email,
        name: profile.full_name || "there",
        membershipType: "free",
        memberId: profile.id,
      });
      console.log("[approve/free-membership] Welcome email sent to:", profile.email);
    } catch (err: any) {
      console.error("[approve/free-membership] Failed to send welcome email:", profile.email, err);
      emailError = err.message || "Failed to send email";
    }

    return NextResponse.json({
      success: true,
      profileId: profile.id,
      emailSent: !emailError,
      emailError,
    });
  } catch (err) {
    console.error("[approve/free-membership] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
