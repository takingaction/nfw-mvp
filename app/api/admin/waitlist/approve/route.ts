import { NextRequest, NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * POST /api/admin/waitlist/approve
 *
 * Approves a waitlist member by moving them to free membership
 * and sending them the welcome email.
 */
export async function POST(request: NextRequest) {
  try {
    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID required" },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

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

    // Check if already approved
    if (member.membership_level === "free" && member.is_approved_free_member) {
      return NextResponse.json(
        { error: "Member is already approved" },
        { status: 400 }
      );
    }

    // Get auth user email
    const { data: authUser } = await supabase.auth.admin.getUserById(memberId);
    const userEmail = authUser?.user?.email || member.email;

    // Update profile to free membership
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        previous_membership_level: "waitlist",
        membership_level: "free",
        is_approved_free_member: true,
        free_membership_contact_submitted: true,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (updateError) {
      console.error("[admin/waitlist/approve] Error updating profile:", updateError);
      return NextResponse.json(
        { error: "Failed to approve member" },
        { status: 500 }
      );
    }

    // Send welcome email
    try {
      await sendWelcomeEmail({
        to: userEmail,
        name: member.full_name || "Member",
        membershipType: "free",
        memberId: memberId,
      });
    } catch (emailErr) {
      console.error("[admin/waitlist/approve] Error sending welcome email:", emailErr);
      // Don't fail the approval if email fails - member is already approved
    }

    return NextResponse.json({
      success: true,
      message: `Member approved and welcome email sent to ${userEmail}`,
    });
  } catch (err) {
    console.error("[admin/waitlist/approve] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
