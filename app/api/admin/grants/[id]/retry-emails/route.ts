import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendGrantApprovedEmail } from "@/lib/email";
import { sendBatchEmails } from "@/lib/email-batch";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: cycleId } = await params;

    // Parse request body
    const body = await request.json();
    const { emails, emailType } = body as { emails: string[]; emailType: "approved" | "rejected" };

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "No emails provided" }, { status: 400 });
    }

    if (!emailType || !["approved", "rejected"].includes(emailType)) {
      return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
    }

    // Get cycle info
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, cycle_name, amount_per_grant")
      .eq("id", cycleId)
      .single();

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // Find grants for these emails in this cycle
    const { data: grants } = await supabaseAdmin
      .from("grants")
      .select(`
        id,
        user_id,
        status,
        profiles:user_id (full_name, email)
      `)
      .eq("cycle_id", cycleId)
      .in("status", emailType === "approved" ? ["approved"] : ["not_approved"]);

    // Filter to only grants matching the pasted emails
    const matchedGrants = grants?.filter((g) => {
      const profile = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
      return profile?.email && emails.map((e) => e.toLowerCase()).includes(profile.email.toLowerCase());
    }) || [];

    if (matchedGrants.length === 0) {
      return NextResponse.json({ error: "No matching grants found for these emails" }, { status: 404 });
    }

    // Send emails
    let sent = 0;
    let failed = 0;
    const results: { email: string; success: boolean; error?: string }[] = [];

    if (emailType === "approved") {
      // Send approved emails one by one
      for (const grant of matchedGrants) {
        const profile = Array.isArray(grant.profiles) ? grant.profiles[0] : grant.profiles;
        if (!profile?.email) continue;

        try {
          const result = await sendGrantApprovedEmail({
            to: profile.email,
            name: profile.full_name || "there",
            grantCycleName: cycle.cycle_name,
            amount: cycle.amount_per_grant,
            ctaUrl: `https://nationalfundforwomen.org/grants/view/${grant.id}`,
          });

          // Log the retry
          await supabaseAdmin.from("grant_email_log").insert({
            grant_id: grant.id,
            cycle_id: cycleId,
            email_type: "approved",
            recipient_email: profile.email,
            status: result.success ? "sent" : "failed",
            resend_email_id: result.resendId,
            error_message: result.error,
            retry_count: 1, // TODO: increment existing retry count
          });

          if (result.success) sent++;
          else failed++;
          results.push({ email: profile.email, success: result.success, error: result.error });
        } catch (err: any) {
          failed++;
          results.push({ email: profile.email, success: false, error: err.message });
        }

        // Throttle to avoid rate limits
        await new Promise((r) => setTimeout(r, 110));
      }
    } else {
      // Send rejected emails in batch
      const recipients = matchedGrants.map((g) => {
        const profile = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
        return {
          email: profile!.email!,
          name: profile!.full_name || "there",
          grantId: g.id,
          variables: {
            grantCycleName: cycle.cycle_name,
            ctaUrl: `https://nationalfundforwomen.org/grants/my-applications`,
          },
        };
      });

      const batchResult = await sendBatchEmails({
        recipients,
        templateSlug: "grant-not-approved",
      });

      // Log each result
      for (const result of batchResult.results) {
        const recipient = recipients.find((r) => r.email === result.email);
        if (recipient?.grantId) {
          await supabaseAdmin.from("grant_email_log").insert({
            grant_id: recipient.grantId,
            cycle_id: cycleId,
            email_type: "rejected",
            recipient_email: result.email,
            status: result.success ? "sent" : "failed",
            resend_email_id: result.resendId,
            error_message: result.error,
            retry_count: 1,
          });
        }

        if (result.success) sent++;
        else failed++;
        results.push({ email: result.email, success: result.success, error: result.error });
      }
    }

    return NextResponse.json({
      success: true,
      total: matchedGrants.length,
      sent,
      failed,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
