import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/waitlist/join
 * 
 * Adds the authenticated user to the waitlist.
 * Updates profile with waitlist membership and assigns position.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update profile to waitlist membership
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        membership_level: "waitlist",
        is_approved_free_member: false,
        free_membership_contact_submitted: true,
        waitlist_joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[waitlist/join] Error updating profile:", updateError);
      return NextResponse.json(
        { error: "Failed to join waitlist" },
        { status: 500 }
      );
    }

    // Send welcome email and update timestamp on success
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const { data: waitlistCount } = await supabaseAdmin.rpc("get_waitlist_count");

    const userEmail = authUser?.user?.email;
    const userName = profileData?.full_name || "Member";
    const currentCount = waitlistCount || 0;

    // Check if email already sent (idempotency guard)
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("waitlist_email_sent_at")
      .eq("id", user.id)
      .single();

    if (existingProfile?.waitlist_email_sent_at) {
      return NextResponse.json({ success: true, message: "Email already sent" });
    }

    if (userEmail) {
      try {
        // Dynamically import to avoid circular dependency issues
        const { sendWaitlistWelcomeEmail } = await import("@/lib/email");
        const result = await sendWaitlistWelcomeEmail({
          to: userEmail,
          name: userName,
          waitlistCount: currentCount,
        });

        if (result.success) {
          // Update timestamp - email was sent successfully
          await supabaseAdmin
            .from("profiles")
            .update({ waitlist_email_sent_at: new Date().toISOString() })
            .eq("id", user.id);
        } else {
          console.error(`[waitlist/join] Email not sent: ${result.error}`);
        }
      } catch (err) {
        console.error("[waitlist/join] Email send failed:", err);
        // Don't fail the join if email fails
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error("[waitlist/join] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/waitlist/position
 * 
 * Gets the current user's waitlist position and total count.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's waitlist info
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("waitlist_joined_at")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[waitlist/position] Error fetching profile:", profileError);
      return NextResponse.json(
        { error: "Failed to fetch waitlist position" },
        { status: 500 }
      );
    }

    // Get total waitlist count
    const { data: totalCount, error: countError } = await supabaseAdmin
      .rpc("get_waitlist_count");

    if (countError) {
      console.error("[waitlist/position] Error getting count:", countError);
      return NextResponse.json(
        { error: "Failed to fetch waitlist count" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      joinedAt: profile?.waitlist_joined_at,
      totalInQueue: totalCount || 0,
    });
  } catch (err) {
    console.error("[waitlist/position] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
