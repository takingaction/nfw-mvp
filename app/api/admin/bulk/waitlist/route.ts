import { NextRequest, NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import { sendWaitlistWelcomeEmail } from "@/lib/email";

const BATCH_DELAY_MS = 200;

/**
 * GET /api/admin/bulk/waitlist
 * 
 * Gets all waitlist members with their email status.
 */
export async function GET() {
  try {
    const supabase = getAdminClient();

    // Fetch all waitlist members
    const { data: members, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        waitlist_position,
        waitlist_joined_at,
        waitlist_email_sent_at,
        joined_at
      `)
      .eq("membership_level", "waitlist")
      .order("waitlist_position", { ascending: true });

    if (error) {
      console.error("[admin/bulk/waitlist] Error fetching waitlist:", error);
      return NextResponse.json(
        { error: "Failed to fetch waitlist" },
        { status: 500 }
      );
    }

    const stats = {
      total: members?.length || 0,
      emailsSent: members?.filter(m => m.waitlist_email_sent_at).length || 0,
      emailsPending: members?.filter(m => !m.waitlist_email_sent_at).length || 0,
    };

    return NextResponse.json({
      members: members || [],
      stats,
    });
  } catch (err) {
    console.error("[admin/bulk/waitlist] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/bulk/waitlist
 * 
 * Sends welcome emails to all waitlist members who haven't received one yet.
 * Processes in batches of 50 with 200ms delays between batches.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();

    // Get all waitlist members who haven't received email
    const { data: members, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        waitlist_position
      `)
      .eq("membership_level", "waitlist")
      .is("waitlist_email_sent_at", null)
      .order("waitlist_position", { ascending: true });

    if (error) {
      console.error("[admin/bulk/waitlist] Error fetching members:", error);
      return NextResponse.json(
        { error: "Failed to fetch waitlist members" },
        { status: 500 }
      );
    }

    if (!members || members.length === 0) {
      return NextResponse.json({
        sent: 0,
        failed: 0,
        total: 0,
        errors: [],
        message: "No waitlist members pending email",
      });
    }

    // Get total waitlist count for position display
    const { count: totalWaitlist } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("membership_level", "waitlist");

    const totalWaitlistCount = totalWaitlist ?? members.length;

    const result = {
      sent: 0,
      failed: 0,
      total: members.length,
      errors: [] as { id: string; email: string; error: string }[],
    };

    // Process each member with delay between sends
    for (let i = 0; i < members.length; i++) {
      const member = members[i];

      try {
        await sendWaitlistWelcomeEmail({
          to: member.email,
          name: member.full_name || "Member",
          waitlistCount: totalWaitlistCount,
        });

        // Mark email as sent
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ waitlist_email_sent_at: new Date().toISOString() })
          .eq("id", member.id);

        if (updateError) {
          console.error(`[admin/bulk/waitlist] Failed to update sent timestamp for ${member.email}:`, updateError);
        }

        result.sent++;
      } catch (err: any) {
        console.error(`[admin/bulk/waitlist] Failed to send to ${member.email}:`, err);
        result.failed++;
        result.errors.push({
          id: member.id,
          email: member.email,
          error: err?.message || "Failed to send email",
        });
      }

      // Delay between sends (except for last one)
      if (i < members.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    return NextResponse.json({
      ...result,
      message: `Sent ${result.sent} emails, ${result.failed} failed`,
    });
  } catch (err) {
    console.error("[admin/bulk/waitlist] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/bulk/waitlist
 * 
 * Sends welcome email to a single waitlist member.
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

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
      .select(`
        id,
        full_name,
        email,
        waitlist_position
      `)
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Get total waitlist count
    const { count: totalWaitlist } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("membership_level", "waitlist");

    const totalWaitlistCount = totalWaitlist ?? 1;

    // Send email
    await sendWaitlistWelcomeEmail({
      to: member.email,
      name: member.full_name || "Member",
      waitlistCount: totalWaitlistCount,
    });

    // Mark email as sent
    await supabase
      .from("profiles")
      .update({ waitlist_email_sent_at: new Date().toISOString() })
      .eq("id", memberId);

    return NextResponse.json({
      success: true,
      message: `Email sent to ${member.email}`,
    });
  } catch (err) {
    console.error("[admin/bulk/waitlist] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}