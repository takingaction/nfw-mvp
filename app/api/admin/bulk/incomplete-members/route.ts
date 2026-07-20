import { NextRequest, NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import { sendIncompleteMemberEmail, fetchTemplateWithActiveCheck } from "@/lib/email";
import { getPreRenderedHtmlAdmin } from "@/lib/email-blocks/publish";

const BATCH_DELAY_MS = 200;

/**
 * GET /api/admin/bulk/incomplete-members
 * 
 * Gets all incomplete members with their email status.
 * Uses the same query logic as admin/members page.
 */
export async function GET() {
  try {
    const supabase = getAdminClient();

    // Fetch ALL profiles via pagination to bypass 1000 row limit
    const pageSize = 1000;
    const allProfiles: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          profile_completed,
          incomplete_email_sent_at,
          free_membership_contact_submitted,
          membership_level,
          is_admin,
          is_approved_free_member,
          joined_at
        `)
        .order("joined_at", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("[admin/bulk/incomplete-members] Error fetching profiles:", error);
        return NextResponse.json(
          { error: "Failed to fetch incomplete members" },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        allProfiles.push(...data);
        page++;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    // Filter to incomplete members using exact analytics logic
    const members = allProfiles.filter(
      (p) =>
        p.profile_completed !== true ||
        (p.membership_level === "free" &&
          p.is_approved_free_member !== true &&
          p.free_membership_contact_submitted === false)
    );

    const stats = {
      total: members.length,
      emailsSent: members.filter(m => m.incomplete_email_sent_at).length,
      emailsPending: members.filter(m => !m.incomplete_email_sent_at).length,
    };

    return NextResponse.json({
      members,
      stats,
    });
  } catch (err) {
    console.error("[admin/bulk/incomplete-members] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/bulk/incomplete-members
 *
 * Sends reengagement emails to all incomplete members who haven't received one yet.
 * Processes in batches with delays between sends.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();

    // Fetch ALL profiles via pagination to bypass 1000 row limit
    const pageSize = 1000;
    const allProfiles: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          profile_completed,
          incomplete_email_sent_at,
          free_membership_contact_submitted,
          membership_level,
          is_admin,
          is_approved_free_member
        `)
        .is("incomplete_email_sent_at", null)
        .order("joined_at", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("[admin/bulk/incomplete-members] Error fetching members:", error);
        return NextResponse.json(
          { error: "Failed to fetch incomplete members" },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        allProfiles.push(...data);
        page++;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    // Filter to incomplete members using exact analytics logic
    const members = allProfiles.filter(
      (p) =>
        p.profile_completed !== true ||
        (p.membership_level === "free" &&
          p.is_approved_free_member !== true &&
          p.free_membership_contact_submitted === false)
    );

    if (members.length === 0) {
      return NextResponse.json({
        sent: 0,
        failed: 0,
        total: 0,
        errors: [],
        message: "No incomplete members pending email",
      });
    }

    // PRE-FLIGHT CHECK: Verify template is active and has content
    const templateCheck = await fetchTemplateWithActiveCheck("incomplete-member-reengagement");
    if (!templateCheck.template) {
      return NextResponse.json({
        error: "Email template not found",
        code: "TEMPLATE_NOT_FOUND"
      }, { status: 400 });
    }
    if (!templateCheck.isActive) {
      return NextResponse.json({
        error: "Email template is not active. Please enable it in the Email Templates admin page.",
        code: "TEMPLATE_INACTIVE"
      }, { status: 400 });
    }
    const contentCheck = await getPreRenderedHtmlAdmin("incomplete-member-reengagement", {});
    if (!contentCheck) {
      return NextResponse.json({
        error: "Email template has no published content. Please publish it in the Email Templates builder.",
        code: "NO_PUBLISHED_CONTENT"
      }, { status: 400 });
    }

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
        await sendIncompleteMemberEmail({
          to: member.email,
          name: member.full_name || "Member",
        });

        // Mark email as sent
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ incomplete_email_sent_at: new Date().toISOString() })
          .eq("id", member.id);

        if (updateError) {
          console.error(`[admin/bulk/incomplete-members] Failed to update sent timestamp for ${member.email}:`, updateError);
        }

        result.sent++;
      } catch (err: any) {
        console.error(`[admin/bulk/incomplete-members] Failed to send to ${member.email}:`, err);
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
    console.error("[admin/bulk/incomplete-members] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/bulk/incomplete-members
 * 
 * Sends reengagement email to a single incomplete member.
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
        email
      `)
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // PRE-FLIGHT CHECK: Verify template is active and has content
    const templateCheck = await fetchTemplateWithActiveCheck("incomplete-member-reengagement");
    if (!templateCheck.template) {
      return NextResponse.json(
        { error: "Email template not found" },
        { status: 400 }
      );
    }
    if (!templateCheck.isActive) {
      return NextResponse.json(
        { error: "Email template is not active. Please enable it in the Email Templates admin page." },
        { status: 400 }
      );
    }
    const contentCheck = await getPreRenderedHtmlAdmin("incomplete-member-reengagement", {});
    if (!contentCheck) {
      return NextResponse.json(
        { error: "Email template has no published content. Please publish it in the Email Templates builder." },
        { status: 400 }
      );
    }

    // Send email
    await sendIncompleteMemberEmail({
      to: member.email,
      name: member.full_name || "Member",
    });

    // Mark email as sent
    await supabase
      .from("profiles")
      .update({ incomplete_email_sent_at: new Date().toISOString() })
      .eq("id", memberId);

    return NextResponse.json({
      success: true,
      message: `Email sent to ${member.email}`,
    });
  } catch (err) {
    console.error("[admin/bulk/incomplete-members] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}