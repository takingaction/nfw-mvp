import { NextRequest, NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendWaitlistApprovalEmail } from "@/lib/email";

const TOKEN_TTL_DAYS = 30;
const SITE_URL = "https://www.nationalfundforwomen.org";

/**
 * POST /api/admin/waitlist/approve
 *
 * Two-step waitlist approval:
 *   1. Admin clicks Approve → creates waitlist_acceptance_tokens row (30 days)
 *      → sends "Waitlist Approval" email with link to /auth/accept-waitlist?token=<uuid>
 *   2. Member clicks the link → /auth/accept-waitlist page marks token used
 *      and upgrades profile to free membership.
 *
 * Profile stays as membership_level='waitlist' until member accepts.
 * Cron at /api/cron/waitlist-acceptance handles day-23 reminders and
 * day-30 expiry (resets waitlist_joined_at to NOW()).
 *
 * Flodesk resync (exiting the Waitlist segment) is intentionally NOT
 * called here — it happens when the member accepts, not when admin approves.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();

    // Authenticate admin via cookie session
    const serverSupabase = await createServerClient();
    const {
      data: { user: adminUser },
      error: authError,
    } = await serverSupabase.auth.getUser();

    if (authError || !adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", adminUser.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID required" },
        { status: 400 }
      );
    }

    // Get member details
    const { data: member, error: memberError } = await supabase
      .from("profiles")
      .select("id, email, full_name, membership_level, is_approved_free_member")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Only waitlist members can be approved
    if (member.membership_level !== "waitlist") {
      return NextResponse.json(
        {
          error: `Member is not on the waitlist (current level: ${member.membership_level})`,
        },
        { status: 400 }
      );
    }

    // Already approved (sanity check; profiles.waitlist_acceptance_sent_at
    // would also indicate this). The token unique index is the real guard.
    if (member.is_approved_free_member) {
      return NextResponse.json(
        { error: "Member is already approved" },
        { status: 400 }
      );
    }

    // Get auth user email (fallback if profile.email is null)
    const { data: authUser } = await supabase.auth.admin.getUserById(memberId);
    const userEmail = authUser?.user?.email || member.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: "Member has no email address on file" },
        { status: 400 }
      );
    }

    // Compute token expiry (30 days from now)
    const expiresAt = new Date(
      Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Create the acceptance token. The partial unique index
    // (used_at IS NULL AND expired_processed_at IS NULL) prevents
    // duplicate live tokens per user.
    const { data: tokenRow, error: tokenError } = await supabase
      .from("waitlist_acceptance_tokens")
      .insert({
        user_id: memberId,
        granted_by: adminUser.id,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (tokenError) {
      if (tokenError.code === "23505") {
        return NextResponse.json(
          { error: "An approval is already pending for this member" },
          { status: 400 }
        );
      }
      console.error("[admin/waitlist/approve] Error creating token:", tokenError);
      return NextResponse.json(
        { error: "Failed to create approval token" },
        { status: 500 }
      );
    }

    // Update profile: mark approval email sent. membership_level stays
    // 'waitlist' until the member clicks the acceptance link.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        waitlist_acceptance_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (updateError) {
      console.error("[admin/waitlist/approve] Error updating profile:", updateError);
      // Don't fail the approval — the token row is already created and the
      // email will go out below. Profile timestamp will be stale but the
      // cron expiry handler will reset it on day 30 anyway.
    }

    // Send the approval email with the acceptance link
    const acceptUrl = `${SITE_URL}/auth/accept-waitlist?token=${tokenRow.id}`;

    try {
      await sendWaitlistApprovalEmail({
        to: userEmail,
        name: member.full_name || "Member",
        acceptUrl,
      });
    } catch (emailErr) {
      console.error("[admin/waitlist/approve] Error sending approval email:", emailErr);
      // Don't fail the approval if email fails — token is created, admin
      // can re-trigger from /admin/waitlist if needed in future.
    }

    return NextResponse.json({
      success: true,
      message: `Approval email sent to ${userEmail}. Member has 30 days to accept.`,
      tokenId: tokenRow.id,
      expiresAt,
    });
  } catch (err) {
    console.error("[admin/waitlist/approve] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
