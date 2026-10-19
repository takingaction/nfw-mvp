import { NextRequest, NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendApprovalEmailForToken, waitlistTokenExpiry } from "@/lib/waitlist-approval";

/**
 * POST /api/admin/waitlist/resend
 *
 * Re-sends the waitlist approval email with a FRESH link for a member who
 * was approved but hasn't accepted yet (e.g. the first email bounced).
 *
 *   1. Retire the member's current live token by setting
 *      expired_processed_at = NOW(). The old link then renders the
 *      "invitation has expired" page, and the cron skips it, so the
 *      member's waitlist_joined_at is NOT reset.
 *   2. Create a new token with a fresh 30-day expiry. reminder_sent_at
 *      starts NULL, so the day-23 reminder follows the new token.
 *   3. Reset profiles.waitlist_acceptance_sent_at so "days left" restarts.
 *   4. Send the approval email and link it to the new token.
 *
 * If step 2 fails, step 1 is reverted so the member keeps a working link.
 *
 * Body: { memberId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();

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
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    const { data: member, error: memberError } = await supabase
      .from("profiles")
      .select("id, email, full_name, membership_level, is_approved_free_member")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (member.membership_level !== "waitlist" || member.is_approved_free_member) {
      return NextResponse.json(
        { error: `Member is no longer on the waitlist (current level: ${member.membership_level})` },
        { status: 400 },
      );
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(memberId);
    const userEmail = authUser?.user?.email || member.email;
    if (!userEmail) {
      return NextResponse.json({ error: "Member has no email address on file" }, { status: 400 });
    }

    // 1. Find and retire the current live token
    const { data: liveToken, error: liveError } = await supabase
      .from("waitlist_acceptance_tokens")
      .select("id")
      .eq("user_id", memberId)
      .is("used_at", null)
      .is("expired_processed_at", null)
      .maybeSingle();

    if (liveError) {
      console.error("[admin/waitlist/resend] Error fetching live token:", liveError);
      return NextResponse.json({ error: "Failed to look up pending approval" }, { status: 500 });
    }

    if (!liveToken) {
      return NextResponse.json(
        { error: "No pending approval for this member — use Approve instead" },
        { status: 400 },
      );
    }

    const retiredAt = new Date().toISOString();
    const { data: retired, error: retireError } = await supabase
      .from("waitlist_acceptance_tokens")
      .update({ expired_processed_at: retiredAt })
      .eq("id", liveToken.id)
      .is("used_at", null)
      .is("expired_processed_at", null)
      .select("id");

    if (retireError || !retired?.length) {
      // Either a DB error, or the member accepted / cron expired it in the meantime.
      console.error("[admin/waitlist/resend] Could not retire token:", retireError);
      return NextResponse.json(
        { error: "The pending approval changed while resending — refresh and try again" },
        { status: 409 },
      );
    }

    // 2. Create the fresh token
    const expiresAt = waitlistTokenExpiry();
    const { data: newToken, error: tokenError } = await supabase
      .from("waitlist_acceptance_tokens")
      .insert({ user_id: memberId, granted_by: adminUser.id, expires_at: expiresAt })
      .select("id")
      .single();

    if (tokenError || !newToken) {
      console.error("[admin/waitlist/resend] Error creating token, reverting:", tokenError);
      await supabase
        .from("waitlist_acceptance_tokens")
        .update({ expired_processed_at: null })
        .eq("id", liveToken.id)
        .eq("expired_processed_at", retiredAt);
      return NextResponse.json({ error: "Failed to create a new approval link" }, { status: 500 });
    }

    // 3. Restart the countdown shown on /admin/waitlist
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        waitlist_acceptance_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (updateError) {
      console.error("[admin/waitlist/resend] Error updating profile:", updateError);
    }

    // 4. Send
    const emailResult = await sendApprovalEmailForToken(supabase, {
      tokenId: newToken.id,
      userId: memberId,
      email: userEmail,
      name: member.full_name,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `New link created, but the email to ${userEmail} failed to send (${emailResult.error}).`,
          tokenId: newToken.id,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `New approval link sent to ${userEmail}. Previous link is now invalid. Expires in 30 days.`,
      tokenId: newToken.id,
      expiresAt,
    });
  } catch (err) {
    console.error("[admin/waitlist/resend] Unexpected error:", err);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
