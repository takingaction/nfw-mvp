import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

// Extract just the grant name portion from cycle name (remove date like "[JULY 26]" and brackets)
function extractGrantName(cycleName: string): string {
  return cycleName
    .replace(/\[[^\]]+\]\s*/gi, '')
    .replace(/^\s+|\s+$/g, '')
    .trim();
}

// Parse a single CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Build a lookup map from check-this.csv: email -> true if delivered for this grant
function buildDeliveredLookup(grantNameKey: string): Map<string, boolean> {
  const delivered = new Map<string, boolean>();

  try {
    const csvPath = resolve(process.cwd(), 'check-this.csv');
    console.log(`[check-resend-delivered] Reading CSV from: ${csvPath}`);
    
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    console.log(`[check-resend-delivered] CSV has ${lines.length} lines`);
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCSVLine(line);
      
      // CSV columns: id, created_at, subject, from, to, cc, bcc, reply_to, last_event, ...
      const lastEvent = cols[8];  // last_event column
      const subject = cols[2];     // subject column
      const to = cols[4];         // to column

      // Check if delivered AND subject contains our grant name (case-insensitive)
      if (lastEvent === 'delivered' && subject.toLowerCase().includes(grantNameKey.toLowerCase())) {
        delivered.set(to.toLowerCase(), true);
      }
    }
    
    console.log(`[check-resend-delivered] Found ${delivered.size} unique delivered emails for "${grantNameKey}"`);
  } catch (err) {
    console.error('[check-resend-delivered] Error reading CSV:', err);
  }

  return delivered;
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

    // Step 2: Build lookup from CSV
    const deliveredLookup = buildDeliveredLookup(grantNameKey);

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

      // Check if this email was delivered (found in CSV lookup)
      const isDelivered = deliveredLookup.get(profile.email.toLowerCase()) || false;

      if (isDelivered) {
        // Mark as already_sent in grant_email_log
        await supabaseAdmin.from("grant_email_log").insert({
          grant_id: grant.id,
          cycle_id: grant.cycle_id,
          email_type: emailType,
          recipient_email: profile.email,
          status: "already_sent",
          resend_email_id: null,
          last_resend_status: "delivered",
        });
        deliveredCount++;
        
        console.log(`[check-resend-delivered] [${checkedCount}/${grants.length}] DELIVERED: ${profile.email}`);
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
        
        console.log(`[check-resend-delivered] [${checkedCount}/${grants.length}] NEEDS RETRY: ${profile.email}`);
      }
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
