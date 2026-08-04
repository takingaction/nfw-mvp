import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendGrantApprovedEmail } from "@/lib/email";
import { sendBatchEmails } from "@/lib/email-batch";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Log email send result to grant_email_log table
 */
async function logEmail({
  grantId,
  cycleId,
  emailType,
  recipientEmail,
  status,
  resendEmailId,
  errorMessage,
}: {
  grantId: string;
  cycleId: string;
  emailType: "approved" | "rejected";
  recipientEmail: string;
  status: "sent" | "failed";
  resendEmailId?: string;
  errorMessage?: string;
}) {
  await supabaseAdmin.from("grant_email_log").insert({
    grant_id: grantId,
    cycle_id: cycleId,
    email_type: emailType,
    recipient_email: recipientEmail,
    status,
    resend_email_id: resendEmailId,
    error_message: errorMessage,
  });
}

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

    // Get cycle info
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("*, grant_tentative_approvals(grant_id, is_approved, combined_score)")
      .eq("id", cycleId)
      .single();

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    if (!cycle.grant_tentative_approvals || cycle.grant_tentative_approvals.length === 0) {
      return NextResponse.json({ error: "No tentative approvals found" }, { status: 400 });
    }

    // Get all grants with profiles
    const { data: allGrants } = await supabaseAdmin
      .from("grants")
      .select(`
        id,
        user_id,
        cycle_id,
        profiles:user_id (full_name, email)
      `)
      .eq("cycle_id", cycleId);

    // Separate into approved and not approved
    const approvedGrantIds = new Set(
      cycle.grant_tentative_approvals
        .filter((t: any) => t.is_approved)
        .map((t: any) => t.grant_id)
    );

    const approvedGrants = allGrants?.filter((g) => approvedGrantIds.has(g.id)) || [];
    const rejectedGrants = allGrants?.filter((g) => !approvedGrantIds.has(g.id)) || [];

    // Update approved grants - set status to 'approved' and add amount_approved
    for (const grant of approvedGrants) {
      await supabaseAdmin
        .from("grants")
        .update({
          status: "approved",
          amount_approved: cycle.amount_per_grant,
        })
        .eq("id", grant.id);
    }

    // Update rejected grants - set status to 'not_approved'
    for (const grant of rejectedGrants) {
      await supabaseAdmin
        .from("grants")
        .update({ status: "not_approved" })
        .eq("id", grant.id);
    }

    // Update cycle final_approved_at
    await supabaseAdmin
      .from("grant_cycles")
      .update({ final_approved_at: new Date().toISOString() })
      .eq("id", cycleId);

    // Send emails to approved grants (with logging)
    let approvedSent = 0;
    let approvedFailed = 0;
    const approvedFailedEmails: string[] = [];

    for (const grant of approvedGrants) {
      const profile = Array.isArray(grant.profiles) ? grant.profiles[0] : grant.profiles;
      if (profile?.email) {
        try {
          const result = await sendGrantApprovedEmail({
            to: profile.email,
            name: profile.full_name || "there",
            grantCycleName: cycle.cycle_name,
            amount: cycle.amount_per_grant,
            ctaUrl: `https://nationalfundforwomen.org/grants/view/${grant.id}`,
          });

          await logEmail({
            grantId: grant.id,
            cycleId,
            emailType: "approved",
            recipientEmail: profile.email,
            status: result.success ? "sent" : "failed",
            resendEmailId: result.resendId,
            errorMessage: result.error,
          });

          if (result.success) approvedSent++;
          else {
            approvedFailed++;
            approvedFailedEmails.push(profile.email);
          }
        } catch (err: any) {
          await logEmail({
            grantId: grant.id,
            cycleId,
            emailType: "approved",
            recipientEmail: profile.email,
            status: "failed",
            errorMessage: err.message,
          });
          approvedFailed++;
          approvedFailedEmails.push(profile.email);
        }
      }
    }

    // Send batch emails to rejected grants (with logging)
    const rejectedRecipients = rejectedGrants
      .filter((g) => {
        const profile = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
        return profile?.email;
      })
      .map((g) => {
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

    let rejectedSent = 0;
    let rejectedFailed = 0;
    const rejectedFailedEmails: string[] = [];

    if (rejectedRecipients.length > 0) {
      const batchResult = await sendBatchEmails({
        recipients: rejectedRecipients,
        templateSlug: "grant-not-approved",
      });

      // Log each result
      for (const result of batchResult.results) {
        const recipient = rejectedRecipients.find((r) => r.email === result.email);
        if (recipient?.grantId) {
          await logEmail({
            grantId: recipient.grantId,
            cycleId,
            emailType: "rejected",
            recipientEmail: result.email,
            status: result.success ? "sent" : "failed",
            resendEmailId: result.resendId,
            errorMessage: result.error,
          });
        }

        if (result.success) rejectedSent++;
        else {
          rejectedFailed++;
          rejectedFailedEmails.push(result.email);
        }
      }
    }

    return NextResponse.json({
      success: true,
      approved: {
        sent: approvedSent,
        failed: approvedFailed,
        failed_emails: approvedFailedEmails,
      },
      rejected: {
        sent: rejectedSent,
        failed: rejectedFailed,
        failed_emails: rejectedFailedEmails,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
