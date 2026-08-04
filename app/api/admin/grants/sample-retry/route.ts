import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { sendGrantApprovedEmail } from "@/lib/email";
import { sendBatchEmails } from "@/lib/email-batch";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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
    const cycleId = searchParams.get("cycle_id");
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    if (!cycleId) {
      return NextResponse.json({ error: "cycle_id is required" }, { status: 400 });
    }

    // Get failed emails (status='failed') for this cycle, limited
    const { data: pendingLogs, error: logsError } = await supabaseAdmin
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
      .eq("cycle_id", cycleId)
      .eq("status", "failed")
      .order("sent_at", { ascending: true })
      .limit(limit);

    if (logsError) {
      console.error("[sample-retry] Error fetching pending logs:", logsError);
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    if (!pendingLogs || pendingLogs.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        results: [],
        message: "No pending emails to send",
      });
    }

    // Get cycle info
    const { data: cycleData } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, cycle_name, amount_per_grant")
      .eq("id", cycleId)
      .single();

    const cycleInfo: CycleInfo = {
      cycle_name: cycleData?.cycle_name || "the grant cycle",
      amount_per_grant: cycleData?.amount_per_grant || 0,
    };

    // Separate by email type
    const approvedEmails = pendingLogs.filter((e: any) => e.email_type === "approved");
    const rejectedEmails = pendingLogs.filter((e: any) => e.email_type === "rejected");

    const results: {
      email: string;
      status: "sent" | "failed";
      error?: string;
    }[] = [];

    let sent = 0;
    let failed = 0;

    // Send approved emails one by one
    for (const email of approvedEmails) {
      try {
        const result = await sendGrantApprovedEmail({
          to: email.recipient_email,
          name: "there",
          grantCycleName: cycleInfo.cycle_name,
          amount: cycleInfo.amount_per_grant,
          ctaUrl: `https://nationalfundforwomen.org/grants/view/${email.grant_id}`,
        });

        // Update log entry
        await supabaseAdmin
          .from("grant_email_log")
          .update({
            status: result.success ? "sent" : "failed",
            resend_email_id: result.resendId || null,
            error_message: result.error || null,
            retry_count: email.retry_count + 1,
            last_resend_status: result.success ? "sent" : "failed",
          })
          .eq("id", email.id);

        if (result.success) {
          results.push({ email: email.recipient_email, status: "sent" });
          sent++;
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

    // Send rejected emails in batch
    if (rejectedEmails.length > 0) {
      const recipients = rejectedEmails.map((e: any) => ({
        email: e.recipient_email,
        name: "there",
        grantId: e.grant_id,
        variables: {
          grantCycleName: cycleInfo.cycle_name,
          ctaUrl: "https://nationalfundforwomen.org/grants/my-applications",
        },
      }));

      const batchResult = await sendBatchEmails({
        recipients,
        templateSlug: "grant-not-approved",
      });

      // Log each result
      for (let i = 0; i < batchResult.results.length; i++) {
        const result = batchResult.results[i];
        const email = rejectedEmails[i];

        await supabaseAdmin
          .from("grant_email_log")
          .update({
            status: result.success ? "sent" : "failed",
            resend_email_id: result.resendId || null,
            error_message: result.error || null,
            retry_count: email.retry_count + 1,
            last_resend_status: result.success ? "sent" : "failed",
          })
          .eq("id", email.id);

        if (result.success) {
          results.push({ email: result.email, status: "sent" });
          sent++;
        } else {
          results.push({ email: result.email, status: "failed", error: result.error });
          failed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      results,
      message: `Sent ${sent} emails, ${failed} failed`,
    });
  } catch (err: any) {
    console.error("[sample-retry] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
