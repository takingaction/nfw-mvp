import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Hardcoded July cycle IDs - these are the cycles from July 2026
const JULY_CYCLE_IDS = [
  "8986067e-cfbf-4d46-b162-bc8337ac61eb",
  "d89d63e8-7810-42e7-9ce6-91e4ca915d53",
  "8f1467d7-d6ee-4107-ab66-f239b01ca8a8",
];

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

interface CycleInfo {
  id: string;
  cycle_name: string;
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

    // Parse request body for date range
    let dateFrom = "2026-07-29T00:00:00Z";
    let dateTo = "2026-08-02T23:59:59Z";

    try {
      const body = await request.json();
      if (body.date_from) dateFrom = body.date_from;
      if (body.date_to) dateTo = body.date_to;
    } catch {
      // Use defaults if body parsing fails
    }

    // Step 1: Get all applicants (approved + rejected) for the 3 July cycles
    const { data: grants, error: grantsError } = await supabaseAdmin
      .from("grants")
      .select(`
        id,
        user_id,
        cycle_id,
        status,
        profiles:user_id (full_name, email)
      `)
      .in("cycle_id", JULY_CYCLE_IDS)
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
        message: "No applicants found for July cycles",
      });
    }

    // Get cycle names for building subject patterns
    const { data: cyclesData } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, cycle_name")
      .in("id", JULY_CYCLE_IDS);

    const cycleNameMap: Record<string, string> = {};
    cyclesData?.forEach((c: CycleInfo) => {
      cycleNameMap[c.id] = c.cycle_name;
    });

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

      // Filter to only delivered emails and build lookup map
      // Key format: emailAddress_cycleName -> { email_id, last_event }
      for (const email of response.data) {
        // Only process delivered emails
        if (email.last_event === "delivered") {
          // Extract email address from "Name <email@domain>" format
          const emailMatch = email.to.match(/<(.+?)>/) || [null, email.to];
          const emailAddress = emailMatch[1] || email.to;

          // Find which cycle this belongs to by checking subject for cycle name
          for (const cycleId of JULY_CYCLE_IDS) {
            const cycleName = cycleNameMap[cycleId];
            if (cycleName && email.subject.includes(cycleName)) {
              const key = `${emailAddress.toLowerCase()}_${cycleName}`;
              // Only store if not already present (first occurrence wins)
              if (!deliveredEmailsMap.has(key)) {
                deliveredEmailsMap.set(key, {
                  email_id: email.id,
                  last_event: email.last_event,
                });
              }
              break;
            }
          }
        }
      }

      cursor = response.has_more ? response.next_cursor : undefined;

      // Throttle to avoid rate limits
      await new Promise((r) => setTimeout(r, 110));
    } while (cursor);

    console.log(`[check-resend-delivered] Found ${deliveredEmailsMap.size} delivered emails in Resend`);

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

      const cycleName = cycleNameMap[grant.cycle_id];
      if (!cycleName) continue;

      const emailKey = `${profile.email.toLowerCase()}_${cycleName}`;
      const wasDelivered = deliveredEmailsMap.has(emailKey);

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
