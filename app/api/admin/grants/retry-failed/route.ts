import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sendGrantApprovedEmail } from "@/lib/email";
import { sendBatchEmails } from "@/lib/email-batch";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

// Check Resend API for email delivery status
async function checkResendStatus(resendEmailId: string): Promise<{
  found: boolean;
  status: "delivered" | "bounced" | "failed" | "unknown";
}> {
  try {
    const resend = getResendClient();
    // Resend's API to get email details
    const { data, error } = await resend.emails.get(resendEmailId);
    
    if (error || !data) {
      // Not found in Resend - could be 429 case or deleted
      return { found: false, status: "unknown" };
    }

    // Cast to any to access dynamic properties
    const emailData = data as any;
    
    // Resend email status: 'sent', 'delivered', 'bounced', 'complained'
    if (emailData.bounced_at) {
      return { found: true, status: "bounced" };
    }
    if (emailData.delivered_at) {
      return { found: true, status: "delivered" };
    }
    if (emailData.complained_at) {
      return { found: true, status: "failed" }; // Mark complained as failed for our purposes
    }
    
    return { found: true, status: "unknown" };
  } catch (err) {
    console.error("[retry-failed] Resend API error:", err);
    return { found: false, status: "unknown" };
  }
}

interface RetryEmail {
  id: string;
  grant_id: string;
  cycle_id: string;
  email_type: "approved" | "rejected";
  recipient_email: string;
  resend_email_id: string | null;
  retry_count: number;
}

interface CycleInfo {
  cycle_name: string;
  amount_per_grant: number;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cycleIdsParam = searchParams.get("cycle_ids");
    
    // If cycle_ids provided in body or query, use them
    let cycleIds: string[] | null = null;
    if (cycleIdsParam) {
      cycleIds = cycleIdsParam.split(",").map((id) => id.trim()).filter(Boolean);
    }

    // Get all failed emails to retry
    let query = supabaseAdmin
      .from("grant_email_log")
      .select(`
        id,
        grant_id,
        cycle_id,
        email_type,
        recipient_email,
        resend_email_id,
        retry_count
      `)
      .eq("status", "failed");

    if (cycleIds && cycleIds.length > 0) {
      query = query.in("cycle_id", cycleIds);
    }

    const { data: failedLogs, error: logsError } = await query;

    if (logsError) {
      console.error("[retry-failed] Error fetching failed logs:", logsError);
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    if (!failedLogs || failedLogs.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        retried: 0,
        skipped_already_sent: 0,
        failed: 0,
        results: [],
        message: "No failed emails to retry",
      });
    }

    // Get cycle info for all cycles
    const uniqueCycleIds = [...new Set(failedLogs.map((l: any) => l.cycle_id))];
    const { data: cyclesData } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, cycle_name, amount_per_grant")
      .in("id", uniqueCycleIds);

    const cycleInfo: Record<string, CycleInfo> = {};
    cyclesData?.forEach((c: any) => {
      cycleInfo[c.id] = { cycle_name: c.cycle_name, amount_per_grant: c.amount_per_grant };
    });

    // Group emails by type for batch sending
    const emailsToRetry: RetryEmail[] = [];
    const skippedAlreadySent: { email: string; reason: string }[] = [];

    // Check each email's Resend status (for those with resend_email_id)
    for (const log of failedLogs as any[]) {
      if (log.resend_email_id) {
        // Has Resend ID - check status first
        const resendStatus = await checkResendStatus(log.resend_email_id);
        
        if (resendStatus.status === "delivered") {
          // Already delivered - mark as already_sent and skip
          await supabaseAdmin
            .from("grant_email_log")
            .update({
              status: "already_sent",
              last_resend_status: "delivered",
            })
            .eq("id", log.id);
          
          skippedAlreadySent.push({
            email: log.recipient_email,
            reason: "already_delivered",
          });
          continue;
        }
        
        // Bounced, failed, or unknown - retry
        emailsToRetry.push(log);
      } else {
        // No Resend ID (429 case) - safe to retry immediately
        emailsToRetry.push(log);
      }
      
      // Throttle Resend API calls to avoid rate limits
      await new Promise((r) => setTimeout(r, 110));
    }

    // Separate by email type
    const approvedEmails = emailsToRetry.filter((e) => e.email_type === "approved");
    const rejectedEmails = emailsToRetry.filter((e) => e.email_type === "rejected");

    // Results tracking
    const results: {
      email: string;
      status: "retried" | "skipped" | "failed";
      reason?: string;
      error?: string;
    }[] = [];

    let retried = 0;
    let failed = 0;

    // Send approved emails one by one (they use individual template)
    for (const email of approvedEmails) {
      const cycle = cycleInfo[email.cycle_id];
      if (!cycle) {
        results.push({ email: email.recipient_email, status: "failed", error: "Cycle not found" });
        failed++;
        continue;
      }

      try {
        const result = await sendGrantApprovedEmail({
          to: email.recipient_email,
          name: "there", // We don't have name in this context, but template handles it
          grantCycleName: cycle.cycle_name,
          amount: cycle.amount_per_grant,
          ctaUrl: `https://nationalfundforwomen.org/grants/view/${email.grant_id}`,
        });

        // Log new attempt
        await supabaseAdmin.from("grant_email_log").insert({
          grant_id: email.grant_id,
          cycle_id: email.cycle_id,
          email_type: "approved",
          recipient_email: email.recipient_email,
          status: result.success ? "sent" : "failed",
          resend_email_id: result.resendId || null,
          error_message: result.error || null,
          retry_count: email.retry_count + 1,
          last_resend_status: result.success ? "sent" : "failed",
        });

        if (result.success) {
          results.push({ email: email.recipient_email, status: "retried" });
          retried++;
        } else {
          results.push({ email: email.recipient_email, status: "failed", error: result.error });
          failed++;
        }
      } catch (err: any) {
        results.push({ email: email.recipient_email, status: "failed", error: err.message });
        failed++;
      }

      // Throttle to avoid rate limits
      await new Promise((r) => setTimeout(r, 110));
    }

    // Send rejected emails in batch (they use batch template)
    if (rejectedEmails.length > 0) {
      const recipients = rejectedEmails.map((e) => {
        const cycle = cycleInfo[e.cycle_id];
        return {
          email: e.recipient_email,
          name: "there",
          grantId: e.grant_id,
          variables: {
            grantCycleName: cycle?.cycle_name || "the grant cycle",
            ctaUrl: "https://nationalfundforwomen.org/grants/my-applications",
          },
        };
      });

      const batchResult = await sendBatchEmails({
        recipients,
        templateSlug: "grant-not-approved",
      });

      // Log each result
      for (let i = 0; i < batchResult.results.length; i++) {
        const result = batchResult.results[i];
        const email = rejectedEmails[i];

        await supabaseAdmin.from("grant_email_log").insert({
          grant_id: email.grant_id,
          cycle_id: email.cycle_id,
          email_type: "rejected",
          recipient_email: result.email,
          status: result.success ? "sent" : "failed",
          resend_email_id: result.resendId || null,
          error_message: result.error || null,
          retry_count: email.retry_count + 1,
          last_resend_status: result.success ? "sent" : "failed",
        });

        if (result.success) {
          results.push({ email: result.email, status: "retried" });
          retried++;
        } else {
          results.push({ email: result.email, status: "failed", error: result.error });
          failed++;
        }
      }
    }

    // Add skipped already sent to results
    skippedAlreadySent.forEach((s) => {
      results.push({ email: s.email, status: "skipped", reason: s.reason });
    });

    return NextResponse.json({
      success: true,
      total: failedLogs.length,
      retried,
      skipped_already_sent: skippedAlreadySent.length,
      failed,
      results,
    });
  } catch (err: any) {
    console.error("[retry-failed] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
