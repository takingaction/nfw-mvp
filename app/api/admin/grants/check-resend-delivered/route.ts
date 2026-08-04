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

// Extract just the grant name portion from cycle name (remove date like "[JULY 26]" and brackets)
function extractGrantName(cycleName: string): string {
  // Remove patterns like "[JULY 26]", "[AUGUST 1]", etc.
  return cycleName
    .replace(/\[[^\]]+\]\s*/gi, '')  // Remove [anything] including brackets and trailing space
    .replace(/^\s+|\s+$/g, '')       // Trim whitespace
    .trim();
}

// Check if an email was delivered for a specific cycle
async function checkEmailDelivered(
  resendApiKey: string,
  email: string,
  cycleName: string
): Promise<{ delivered: boolean; resendId?: string; subject?: string }> {
  try {
    // Extract just the grant name portion for matching
    const grantNameKey = extractGrantName(cycleName);
    
    // Query Resend for emails sent TO this address
    const url = `https://api.resend.com/emails?to=${encodeURIComponent(email)}&limit=50`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.log(`[check-resend-delivered] Resend API error for ${email}:`, res.status);
      return { delivered: false };
    }

    const response: ResendListResponse = await res.json();
    
    // Check if ANY email to this address was delivered with matching grant name
    for (const emailRecord of response.data || []) {
      if (emailRecord.last_event === "delivered") {
        // Check if subject contains our grant name key phrase (case-insensitive)
        if (grantNameKey && emailRecord.subject.toLowerCase().includes(grantNameKey.toLowerCase())) {
          return { 
            delivered: true, 
            resendId: emailRecord.id,
            subject: emailRecord.subject
          };
        }
      }
    }

    return { delivered: false };
  } catch (err) {
    console.error(`[check-resend-delivered] Error checking email ${email}:`, err);
    return { delivered: false };
  }
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
    const grantNameKey = extractGrantName(cycleName);
    console.log("[check-resend-delivered] ============================================");
    console.log("[check-resend-delivered] Checking cycle:", cycleName);
    console.log("[check-resend-delivered] Matching on key phrase:", grantNameKey);
    console.log("[check-resend-delivered] Number of applicants:", grants.length);
    console.log("[check-resend-delivered] Profiles fetched:", profilesData?.length || 0);

    // Step 2: Check each applicant email one at a time
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const needsRetry: {
      grant_id: string;
      email: string;
      cycle_name: string;
      type: "approved" | "rejected";
    }[] = [];
    let deliveredCount = 0;
    let checkedCount = 0;

    for (const grant of grantsWithProfiles as GrantApplicant[]) {
      const profile = grant.profiles?.[0];
      if (!profile?.email) {
        console.log("[check-resend-delivered] Skipping grant - no profile email:", grant.id);
        continue;
      }

      checkedCount++;
      const emailType: "approved" | "rejected" =
        grant.status === "approved" || grant.status === "payment_sent" ? "approved" : "rejected";

      // Check this email against Resend
      const result = await checkEmailDelivered(resendApiKey, profile.email, cycleName);

      if (result.delivered) {
        // Mark as already_sent in grant_email_log
        await supabaseAdmin.from("grant_email_log").insert({
          grant_id: grant.id,
          cycle_id: grant.cycle_id,
          email_type: emailType,
          recipient_email: profile.email,
          status: "already_sent",
          resend_email_id: result.resendId || null,
          last_resend_status: "delivered",
        });
        deliveredCount++;
        
        console.log(`[check-resend-delivered] [${checkedCount}/${grants.length}] DELIVERED: ${profile.email} - "${result.subject}"`);
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
        
        console.log(`[check-resend-delivered] [${checkedCount}/${grants.length}] NEEDS RETRY: ${profile.email} (not found as delivered)`);
      }

      // Throttle to avoid rate limits (110ms = ~9 calls per second)
      await new Promise((r) => setTimeout(r, 110));
    }

    console.log("[check-resend-delivered] ============================================");
    console.log("[check-resend-delivered] FINAL RESULT - Checked:", checkedCount, "delivered:", deliveredCount, "needRetry:", needsRetry.length);
    console.log("[check-resend-delivered] ============================================");

    return NextResponse.json({
      success: true,
      checked: checkedCount,
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