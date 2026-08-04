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
  to: string | string[] | { email: string; name?: string }[];
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

// Helper to extract email address from various to formats
function extractEmailAddress(toAddr: string | { email: string; name?: string }): string | null {
  if (!toAddr) return null;
  
  // Handle object format: {email: "test@test.com", name: "Name"}
  if (typeof toAddr === 'object' && 'email' in toAddr) {
    return (toAddr as { email: string }).email?.toLowerCase() || null;
  }
  
  // Handle string format: "Name <test@test.com>" or just "test@test.com"
  if (typeof toAddr === 'string') {
    const emailMatch = toAddr.match(/<(.+?)>/);
    return emailMatch ? emailMatch[1].toLowerCase() : toAddr.toLowerCase();
  }
  
  return null;
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
    let cycleId: string | null = null;

    try {
      const body = await request.json();
      if (body.cycle_id) cycleId = body.cycle_id;
    } catch {
      // Use defaults if body parsing fails
    }

    if (!cycleId) {
      return NextResponse.json({ error: "cycle_id is required" }, { status: 400 });
    }

    // Step 1: Get all applicants (approved + rejected) for this specific cycle
    // Query grants and profiles separately, then join in JavaScript
    const { data: grants, error: grantsError } = await supabaseAdmin
      .from("grants")
      .select(`
        id,
        user_id,
        cycle_id,
        status
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

    // Fetch profiles separately for all user_ids
    const userIds = grants.map((g: any) => g.user_id).filter(Boolean);
    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    // Build a map of user_id -> profile
    const profileMap = new Map<string, GrantProfile>();
    profilesData?.forEach((p: GrantProfile & { id: string }) => {
      profileMap.set(p.id, { email: p.email, full_name: p.full_name });
    });

    // Combine grants with their profiles
    const grantsWithProfiles = grants.map((g: any) => ({
      ...g,
      profiles: profileMap.has(g.user_id) ? [profileMap.get(g.user_id)] : null
    }));

    // Get this cycle's name for building subject pattern
    const { data: cycleData } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, cycle_name")
      .eq("id", cycleId)
      .single();

    const cycleName = cycleData?.cycle_name || "";
    console.log("[check-resend-delivered] ============================================");
    console.log("[check-resend-delivered] Checking cycle:", cycleName);
    console.log("[check-resend-delivered] Number of applicants:", grants.length);
    console.log("[check-resend-delivered] Profiles fetched:", profilesData?.length || 0);
    console.log("[check-resend-delivered] Sample grant with profile:", JSON.stringify(grantsWithProfiles[0], null, 2));

    // Step 2: Query Resend REST API for ALL emails using pagination
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const deliveredEmailsMap = new Map<string, { email_id: string; last_event: string }>();
    
    let cursor: string | undefined = undefined;
    let totalEmailsFetched = 0;
    let totalDeliveredFound = 0;
    let totalCyclesMatched = 0;
    let pageCount = 0;
    const maxPages = 200;

    do {
      pageCount++;
      if (pageCount > maxPages) {
        console.warn("[check-resend-delivered] Hit max pages limit, stopping pagination");
        break;
      }

      let url = `https://api.resend.com/emails?limit=100`;
      if (cursor) {
        url += `&cursor=${cursor}`;
      }
      
      console.log("[check-resend-delivered] Fetching page", pageCount);

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[check-resend-delivered] Resend API error:", res.status, errorText);
        return NextResponse.json(
          { error: `Resend API error: ${res.status} - ${errorText}` },
          { status: 500 }
        );
      }

      const response: ResendListResponse = await res.json();
      const emailsOnPage = response.data?.length || 0;
      totalEmailsFetched += emailsOnPage;
      
      console.log("[check-resend-delivered] Page", pageCount, "returned", emailsOnPage, "emails, has_more:", response.has_more, "next_cursor:", response.next_cursor ? "yes" : "no");

      // Process each email on this page
      for (const email of response.data || []) {
        // Only process delivered emails
        if (email.last_event === "delivered") {
          totalDeliveredFound++;
          
          // Check if subject contains our cycle name
          if (cycleName && email.subject.includes(cycleName)) {
            totalCyclesMatched++;
            
            // Extract all email addresses from the to field
            const toAddresses = Array.isArray(email.to) ? email.to : [email.to];
            
            for (const toAddr of toAddresses) {
              const emailAddress = extractEmailAddress(toAddr);
              if (!emailAddress) continue;
              
              const key = `${emailAddress}_${cycleName}`;
              
              // Only store first match
              if (!deliveredEmailsMap.has(key)) {
                deliveredEmailsMap.set(key, {
                  email_id: email.id,
                  last_event: email.last_event,
                });
                
                // Debug: log first few matches
                if (deliveredEmailsMap.size <= 5) {
                  console.log("[check-resend-delivered] MATCHED delivered email:", {
                    to: emailAddress,
                    subject: email.subject,
                    last_event: email.last_event
                  });
                }
              }
            }
          }
        }
      }

      // If has_more is true but next_cursor is undefined or "no", use the last email's ID as cursor
      // This handles cases where Resend hasn't generated the cursor yet
      const hasValidCursor = response.has_more && 
        typeof response.next_cursor === 'string' && 
        response.next_cursor.length > 0 &&
        response.next_cursor !== 'no';
      
      if (hasValidCursor) {
        cursor = response.next_cursor;
      } else if (response.has_more && response.data && response.data.length > 0) {
        // Use last email's ID as cursor (cursor-based pagination)
        cursor = response.data[response.data.length - 1].id;
        console.log("[check-resend-delivered] Using last email ID as cursor:", cursor);
      } else {
        cursor = undefined;
      }
      
      console.log("[check-resend-delivered] After page", pageCount, "- has_more:", response.has_more, "- cursor set:", cursor ? "yes" : "no");

      // Throttle to avoid rate limits
      await new Promise((r) => setTimeout(r, 110));
    } while (cursor);

    console.log("[check-resend-delivered] ============================================");
    console.log("[check-resend-delivered] TOTAL EMAILS FETCHED:", totalEmailsFetched);
    console.log("[check-resend-delivered] TOTAL DELIVERED EMAILS:", totalDeliveredFound);
    console.log("[check-resend-delivered] TOTAL MATCHING CYCLE:", totalCyclesMatched);
    console.log("[check-resend-delivered] DELIVERED MAP SIZE:", deliveredEmailsMap.size);
    
    // Show sample of delivered map
    const mapEntries = Array.from(deliveredEmailsMap.entries()).slice(0, 5);
    console.log("[check-resend-delivered] Sample delivered map entries:", JSON.stringify(mapEntries, null, 2));
    console.log("[check-resend-delivered] ============================================");

    // Step 3: Compare applicants against Resend delivered emails
    const needsRetry: {
      grant_id: string;
      email: string;
      cycle_name: string;
      type: "approved" | "rejected";
    }[] = [];
    let deliveredCount = 0;

    for (const grant of grantsWithProfiles as GrantApplicant[]) {
      const profile = grant.profiles?.[0];
      if (!profile?.email) {
        console.log("[check-resend-delivered] Skipping grant - no profile email:", grant.id);
        continue;
      }

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
        
        // Debug: log first few that need retry
        if (needsRetry.length <= 5) {
          console.log("[check-resend-delivered] NEEDS RETRY:", {
            email: profile.email,
            status: grant.status,
            lookingForKey: emailKey
          });
        }
      }
    }

    console.log("[check-resend-delivered] FINAL RESULT - Checked:", grantsWithProfiles.length, "delivered:", deliveredCount, "needRetry:", needsRetry.length);
    console.log("[check-resend-delivered] ============================================");

    return NextResponse.json({
      success: true,
      checked: grantsWithProfiles.length,
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
