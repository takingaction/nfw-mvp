import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAllPages, fetchAllPagesIn } from "@/lib/supabase-paginate";
import { loadEmailedKeys } from "@/lib/grant-email-log";
import { outstandingFailures } from "@/lib/grant-finalize";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
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

    // Get cycle_ids to query - either from param or get recent cycles with failures
    let cycleIds: string[] | null = null;
    
    if (cycleIdsParam) {
      cycleIds = cycleIdsParam.split(",").map((id) => id.trim()).filter(Boolean);
    }

    // Build query for failed emails
    let query = supabaseAdmin
      .from("grant_email_log")
      .select(`
        id,
        grant_id,
        cycle_id,
        email_type,
        recipient_email,
        resend_email_id,
        status,
        error_message,
        retry_count,
        last_resend_status,
        sent_at,
        grant_cycles!inner(
          cycle_name,
          amount_per_grant
        )
      `)
      .eq("status", "failed")
      .order("sent_at", { ascending: false });

    if (cycleIds && cycleIds.length > 0) {
      query = query.in("cycle_id", cycleIds);
    }

    // Paged: PostgREST silently caps a single response at 1000 rows.
    const orderedQuery = query.order("id", { ascending: true });
    const { data: allFailedLogs, error: logsError } = await fetchAllPages((from, to) => orderedQuery.range(from, to));

    if (logsError) {
      console.error("[failed-emails] Error fetching failed logs:", logsError);
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    // Count only failures that still need a send (same rule as retry-failed).
    const { emailed, error: emailedError } = await loadEmailedKeys(
      supabaseAdmin,
      [...new Set(allFailedLogs.map((l: { cycle_id: string }) => l.cycle_id))],
    );
    if (emailedError) {
      return NextResponse.json({ error: `Could not check existing sends: ${emailedError}` }, { status: 500 });
    }
    const failedLogs = outstandingFailures(allFailedLogs, emailed);

    // Also get already_sent counts per cycle for context
    const cycleIdsFromLogs = [...new Set(failedLogs?.map((l) => l.cycle_id) || [])];
    
    let alreadySentCounts: Record<string, number> = {};
    if (cycleIdsFromLogs.length > 0) {
      const { data: alreadySentData } = await fetchAllPagesIn(cycleIdsFromLogs, (chunk, from, to) =>
        supabaseAdmin
          .from("grant_email_log")
          .select("cycle_id")
          .eq("status", "already_sent")
          .in("cycle_id", chunk)
          .order("id", { ascending: true })
          .range(from, to),
      );
      
      alreadySentData?.forEach((log) => {
        alreadySentCounts[log.cycle_id] = (alreadySentCounts[log.cycle_id] || 0) + 1;
      });
    }

    // Get cycle names for context
    const cycleNames: Record<string, string> = {};
    const uniqueCycleIds = [...new Set(failedLogs?.map((l) => l.cycle_id) || [])];
    if (uniqueCycleIds.length > 0) {
      const { data: cyclesData } = await supabaseAdmin
        .from("grant_cycles")
        .select("id, cycle_name")
        .in("id", uniqueCycleIds);
      
      cyclesData?.forEach((c) => {
        cycleNames[c.id] = c.cycle_name;
      });
    }

    // Format response
    const failedEmails = (failedLogs || []).map((log: any) => ({
      id: log.id,
      grant_id: log.grant_id,
      cycle_id: log.cycle_id,
      cycle_name: cycleNames[log.cycle_id] || log.grant_cycles?.cycle_name || "Unknown",
      email: log.recipient_email,
      email_type: log.email_type,
      resend_email_id: log.resend_email_id,
      error_message: log.error_message,
      retry_count: log.retry_count || 0,
      last_resend_status: log.last_resend_status,
      sent_at: log.sent_at,
    }));

    // Group by cycle for easier display
    const byCycle: Record<string, {
      cycle_name: string;
      emails: typeof failedEmails;
      already_sent_count: number;
    }> = {};

    failedEmails.forEach((email) => {
      if (!byCycle[email.cycle_id]) {
        byCycle[email.cycle_id] = {
          cycle_name: email.cycle_name,
          emails: [],
          already_sent_count: alreadySentCounts[email.cycle_id] || 0,
        };
      }
      byCycle[email.cycle_id].emails.push(email);
    });

    return NextResponse.json({
      failed_emails: failedEmails,
      by_cycle: byCycle,
      total_failed: failedEmails.length,
      total_already_sent: Object.values(alreadySentCounts).reduce((a, b) => a + b, 0),
    });
  } catch (err: any) {
    console.error("[failed-emails] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
