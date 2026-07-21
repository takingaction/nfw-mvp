import { NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import { fetchTemplateWithActiveCheck, sendIncompleteMemberEmail } from "@/lib/email";
import { getPreRenderedHtmlAdmin } from "@/lib/email-blocks/publish";

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH_DELAY_MS = 200;
const BATCH_SIZE = 50;

export async function GET(request: Request) {
  // Check CRON_SECRET authorization
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.log("[incomplete-member-reminder] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getAdminClient();

  // Pre-flight check: Verify template is active and has published content
  const templateCheck = await fetchTemplateWithActiveCheck("incomplete-member-reengagement");
  if (!templateCheck.template) {
    console.log("[incomplete-member-reminder] Template not found, skipping");
    return NextResponse.json({ error: "Template not found" }, { status: 400 });
  }
  if (!templateCheck.isActive) {
    console.log("[incomplete-member-reminder] Template inactive, skipping");
    return NextResponse.json({ message: "Template inactive, skipping" }, { status: 200 });
  }
  const contentCheck = await getPreRenderedHtmlAdmin("incomplete-member-reengagement", {});
  if (!contentCheck) {
    console.log("[incomplete-member-reminder] No published content, skipping");
    return NextResponse.json({ message: "No published content, skipping" }, { status: 200 });
  }

  // Find incomplete members who joined 2+ hours ago and haven't received email
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data: allProfiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, joined_at, profile_completed, membership_level, is_approved_free_member, free_membership_contact_submitted")
    .is("incomplete_email_sent_at", null)
    .lt("joined_at", twoHoursAgo)
    .limit(1000);

  if (error) {
    console.error("[incomplete-member-reminder] Error fetching profiles:", error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }

  // Filter to incomplete members using same logic as admin page
  const eligibleMembers = (allProfiles || []).filter((p: any) =>
    p.profile_completed !== true ||
    (p.membership_level === "free" &&
      p.is_approved_free_member !== true &&
      p.free_membership_contact_submitted === false)
  );

  if (eligibleMembers.length === 0) {
    return NextResponse.json({ message: "No eligible members found", sent: 0, failed: 0 });
  }

  // Process in batches
  const result = { sent: 0, failed: 0 };
  const membersToProcess = eligibleMembers.slice(0, BATCH_SIZE);

  for (let i = 0; i < membersToProcess.length; i++) {
    const member = membersToProcess[i];

    try {
      const emailResult = await sendIncompleteMemberEmail({
        to: member.email,
        name: member.full_name || "Member",
      });

      if (emailResult.success) {
        await supabaseAdmin
          .from("profiles")
          .update({ incomplete_email_sent_at: new Date().toISOString() })
          .eq("id", member.id);
        result.sent++;
      } else {
        console.error(`[incomplete-member-reminder] Failed to send to ${member.email}:`, emailResult.error);
        result.failed++;
      }
    } catch (err) {
      console.error(`[incomplete-member-reminder] Error sending to ${member.email}:`, err);
      result.failed++;
    }

    if (i < membersToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`[incomplete-member-reminder] Sent ${result.sent} emails, ${result.failed} failed`);
  return NextResponse.json({
    message: `Sent ${result.sent} emails, ${result.failed} failed`,
    sent: result.sent,
    failed: result.failed,
  });
}
