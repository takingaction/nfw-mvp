import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ResendEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  last_event: string;
  created_at: string;
  delivered_at?: string;
  bounced_at?: string;
  complained_at?: string;
}

interface ResendListResponse {
  data: ResendEmail[];
  has_more: boolean;
  next_cursor?: string;
}

interface GrantProfile {
  full_name: string;
  email: string;
}

interface GrantApplicant {
  id: string;
  user_id: string;
  cycle_id: string;
  status: string;
  profiles: GrantProfile[] | null;
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

    // Parse request body
    let dateFrom = "2026-07-29T00:00:00Z";
    let dateTo = "2026-08-02T23:59:59Z";
    let cycleId: string | null = null;

    try {
      const body = await request.json();
      if (body.date_from) dateFrom = body.date_from;
      if (body.date_to) dateTo = body.date_to;
      if (body.cycle_id) cycleId = body.cycle_id;
    } catch {
      // Use defaults if body parsing fails
    }

    if (!cycleId) {
      return NextResponse.json({ error: "cycle_id is required" }, { status: 400 });
    }

    // Step 1: Get all applicants (approved + rejected) for this specific cycle
    const { data: grants, error: grantsError } = await supabaseAdmin
      .from("grants")
      .select(`
        id,
        user_id,
        cycle_id,
        status,
        profiles:user_id (full_name, email)
      `)
      .eq("cycle_id", cycleId)
      .in("status", ["approved", "payment_sent", "not_approved"]);

    if (grantsError) {
      console.error("[check-resend-delivered] Error fetching grants:", grantsError);
      return NextResponse.json({ error: grantsError.message }, { status: 500 });
    }

    if (!grants || grants.length === 0) {
      return NextResponse.json({
        success: true,
        checked: 0,
        delivered_count: 0,
        needs_retry_count: 0,
        retry_list: [],
        message: "No applicants found for this cycle",
      });
    }

    // Get this cycle's name for building subject pattern
    const { data: cycleData } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, cycle_name")
      .eq("id", cycleId)
      .single();

    const cycleName = cycleData?.cycle_name || "";
    console.log("[check-resend-delivered] Checking cycle:", cycleName);

    // Step 2: Query Resend REST API for emails sent in the date window
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }
    console.log("[check-resend-delivered] RESEND_API_KEY starts with:", resendApiKey?.substring(0, 5));

    // Fetch ALL emails from Resend in the date window using pagination
    const deliveredEmailsMap = new Map<string, { email_id: string; last_event: string }>();

    let cursor: string | undefined = undefined;
    let totalPages = 0;
    const maxPages = 100; // Safety limit

    do {
      totalPages++;
      if (totalPages > maxPages) {
        console.warn("[check-resend-delivered] Hit max pages limit, stopping pagination");
        break;
      }

      let url = `https://api.resend.com/emails?sent_after=${dateFrom}&sent_before=${dateTo}&limit=100`;
      if (cursor) {
        url += `&cursor=${cursor}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[check-resend-delivered] Resend API error:", res.status, errorText);
        console.error("[check-resend-delivered] Full response:", res);
        return NextResponse.json(
          { error: `Resend API error: ${res.status} - ${errorText}` },
          { status: 500 }
        );
      }

      const response: ResendListResponse = await res.json();

      // DEBUG: Log sample of what Resend returns
      if (totalPages === 1) {
        console.log("[check-resend-delivered] Sample email from Resend:", JSON.stringify(response.data?.[0], null, 2));
      }

      // Filter to only delivered emails and build lookup map
      // Key format: emailAddress_cycleName -> { email_id, last_event }
      for (const email of response.data) {
        // DEBUG: Log actual last_event value
        if (totalPages === 1 && response.data.indexOf(email) < 3) {
          console.log(`[check-resend-delivered] Email last_event: "${email.last_event}", subject: "${email.subject}"`);
        }
        
        // Only process delivered emails
        if (email.last_event === "delivered") {
          // email.to can be a string "Name <email>" or an array ["Name <email>"]
          const toAddresses = Array.isArray(email.to) ? email.to : [email.to];
          
          for (const toAddr of toAddresses) {
            if (!toAddr) continue;
            
            // Extract email address from "Name <email@domain>" format
            const emailMatch = toAddr.match(/<(.+?)>/);
            const emailAddress = emailMatch ? emailMatch[1] : toAddr;

            // Check if this email's subject matches our cycle name
            if (cycleName && email.subject.includes(cycleName)) {
              const key = `${emailAddress.toLowerCase()}_${cycleName}`;
              // Only store if not already present (first occurrence wins)
              if (!deliveredEmailsMap.has(key)) {
                deliveredEmailsMap.set(key, {
                  email_id: email.id,
                  last_event: email.last_event,
                });
              }
            }
          }
        }
      }

      cursor = response.has_more ? response.next_cursor : undefined;

      // Throttle to avoid rate limits
      await new Promise((r) => setTimeout(r, 110));
    } while (cursor);

    console.log(`[check-resend-delivered] Found ${deliveredEmailsMap.size} delivered emails in Resend`);
    
    // Debug: show first 5 entries in deliveredEmailsMap
    const mapEntries = Array.from(deliveredEmailsMap.entries()).slice(0, 5);
    console.log("[check-resend-delivered] Sample delivered emails map:", JSON.stringify(mapEntries, null, 2));

    // Step 3: Compare applicants against Resend delivered emails
    const needsRetry: {
      grant_id: string;
      email: string;
      cycle_name: string;
      type: "approved" | "rejected";
    }[] = [];
    let deliveredCount = 0;

    for (const grant of grants as GrantApplicant[]) {
      const profile = grant.profiles?.[0];
      if (!profile?.email) continue;

      const emailKey = `${profile.email.toLowerCase()}_${cycleName}`;
      const wasDelivered = deliveredEmailsMap.has(emailKey);
      
      // Debug: log first few lookups
      if (needsRetry.length < 3 && !wasDelivered) {
        console.log(`[check-resend-delivered] NOT delivered - looking for key: "${emailKey}"`);
      }

      const emailType: "approved" | "rejected" =
        grant.status === "approved" || grant.status === "payment_sent" ? "approved" : "rejected";

      if (wasDelivered) {
        // Mark as already_sent in grant_email_log
        await supabaseAdmin.from("grant_email_log").insert({
          grant_id: grant.id,
          cycle_id: grant.cycle_id,
          email_type: emailType,
          recipient_email: profile.email,
          status: "already_sent",
          resend_email_id: deliveredEmailsMap.get(emailKey)?.email_id || null,
          last_resend_status: "delivered",
        });
        deliveredCount++;
      } else {
        // Needs retry - insert with pending status
        await supabaseAdmin.from("grant_email_log").insert({
          grant_id: grant.id,
          cycle_id: grant.cycle_id,
          email_type: emailType,
          recipient_email: profile.email,
          status: "pending",
        });
        needsRetry.push({
          grant_id: grant.id,
          email: profile.email,
          cycle_name: cycleName,
          type: emailType,
        });
      }
    }

    console.log(`[check-resend-delivered] Checked ${grants.length} emails - ${deliveredCount} delivered, ${needsRetry.length} need retry`);

    return NextResponse.json({
      success: true,
      checked: grants.length,
      delivered_count: deliveredCount,
      needs_retry_count: needsRetry.length,
      retry_list: needsRetry,
      message: `Found ${deliveredCount} delivered, ${needsRetry.length} need retry`,
    });
  } catch (err: unknown) {
    console.error("[check-resend-delivered] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
