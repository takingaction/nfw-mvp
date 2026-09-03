import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Admin auth check
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check for CSV format request
    const url = new URL(request.url);
    const format = url.searchParams.get('format');

    // ========================================
    // CSV FORMAT: Email-level reconciliation
    // ========================================
    if (format === 'csv') {
      return handleCsvFormat(supabase);
    }

    // ========================================
    // JSON FORMAT: Use cached Stripe subscriptions
    // ========================================

    // Step 1: Get cached Stripe subscriptions
    const { data: cachedData, error: cacheError } = await supabaseAdmin
      .from("stripe_subscriptions_cache")
      .select("*")
      .eq("id", "latest")
      .single();

    let stripeSubscriptions: any[] = [];
    let cachedAt: string | null = null;
    let fromCache = false;
    let cacheIncomplete = false;
    let cacheWarning: string | null = null;

    if (!cacheError && cachedData) {
      stripeSubscriptions = cachedData.subscriptions_json || [];
      cachedAt = cachedData.fetched_at;
      fromCache = true;
      cacheIncomplete = cachedData.incomplete || false;
      cacheWarning = cachedData.warning || null;
    } else {
      // No cache - this shouldn't happen if cron is running
      console.warn("[reconcile] No cached subscriptions found - cron may not be running");
    }

    // Calculate Stripe live totals from cached subscriptions
    let stripeContributingCount = 0;
    let stripeContributingTotal = 0;
    let stripeFoundingCount = 0;
    let stripeFoundingTotal = 0;
    const stripeEmailMap = new Map<string, { tier: string; amount: number; customer_id: string }>();

    for (const sub of stripeSubscriptions) {
      const amount = sub.amount / 100; // Convert cents to dollars
      if (amount === 15) {
        stripeContributingCount++;
        stripeContributingTotal += amount;
      } else if (amount === 100) {
        stripeFoundingCount++;
        stripeFoundingTotal += amount;
      }

      // Build email map for missing_from_db check
      if (sub.email) {
        const tier = amount === 15 ? "Contributing" : "Founding";
        const emailLower = sub.email.toLowerCase();
        if (!stripeEmailMap.has(emailLower)) {
          stripeEmailMap.set(emailLower, { tier, amount, customer_id: sub.customer || "" });
        }
      }
    }

    // Step 1b: Find emails in Stripe but not in any profile
    const allProfileEmails = new Set<string>();
    let profilePage = 0;
    const profilePageSize = 1000;
    let hasMoreProfiles = true;

    while (hasMoreProfiles) {
      const { data: profileBatch, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .range(profilePage * profilePageSize, (profilePage + 1) * profilePageSize - 1);

      if (profileError) {
        console.error("[reconcile] Profiles query error:", profileError);
        break;
      }

      const batch = profileBatch || [];
      for (const profile of batch) {
        if (profile.email) {
          allProfileEmails.add(profile.email.toLowerCase());
        }
      }

      profilePage++;
      hasMoreProfiles = batch.length === profilePageSize;
    }

    const missingFromDb: string[] = [];
    for (const email of stripeEmailMap.keys()) {
      if (!allProfileEmails.has(email)) {
        missingFromDb.push(email);
      }
    }
    missingFromDb.sort();

    const stripeLive = {
      contributing: {
        count: stripeContributingCount,
        total: stripeContributingTotal,
      },
      founding: {
        count: stripeFoundingCount,
        total: stripeFoundingTotal,
      },
      total: {
        count: stripeContributingCount + stripeFoundingCount,
        total: stripeContributingTotal + stripeFoundingTotal,
      },
    };

    // Step 2: Get unique users per tier from DB (count profiles, not payments)
    const { data: allPayments, error: paymentsError } = await supabase
      .from("membership_payments")
      .select(`
        id,
        amount,
        stripe_payment_id,
        stripe_invoice_id,
        created_at,
        user_id,
        profiles!inner(email, full_name)
      `)
      .in("amount", [15, 100]);

    if (paymentsError) {
      console.error("[reconcile] Payments query error:", paymentsError);
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    // Calculate our DB totals - count UNIQUE users per tier
    const contributingUserIds = new Set<string>();
    const foundingUserIds = new Set<string>();
    const allUserIds = new Set<string>();

    for (const p of allPayments || []) {
      if (p.amount === 15) {
        contributingUserIds.add(p.user_id);
        allUserIds.add(p.user_id);
      } else if (p.amount === 100) {
        foundingUserIds.add(p.user_id);
        allUserIds.add(p.user_id);
      }
    }

    const dbContributingCount = contributingUserIds.size;
    const dbFoundingCount = foundingUserIds.size;
    const dbContributingTotal = dbContributingCount * 15;
    const dbFoundingTotal = dbFoundingCount * 100;

    const ourDb = {
      contributing: { count: dbContributingCount, total: dbContributingTotal },
      founding: { count: dbFoundingCount, total: dbFoundingTotal },
      total: {
        count: dbContributingCount + dbFoundingCount,
        total: dbContributingTotal + dbFoundingTotal,
      },
    };

    // Calculate differences
    const difference = {
      contributing: {
        count: dbContributingCount - stripeContributingCount,
        total: dbContributingTotal - stripeContributingTotal,
      },
      founding: {
        count: dbFoundingCount - stripeFoundingCount,
        total: dbFoundingTotal - stripeFoundingTotal,
      },
      total: {
        count: (dbContributingCount + dbFoundingCount) - (stripeContributingCount + stripeFoundingCount),
        total: (dbContributingTotal + dbFoundingTotal) - (stripeContributingTotal + stripeFoundingTotal),
      },
    };

    // For now, skip the expensive per-payment verification that caused timeouts
    // This data is still useful but requires too many API calls
    const verifiedCount = { valid: 0, refunded: 0, failed: 0, not_found: 0 };
    const problematicPayments: any[] = [];

    return NextResponse.json({
      summary: {
        stripe_live: stripeLive,
        our_db: ourDb,
        difference,
      },
      verified: verifiedCount,
      problematic_payments: problematicPayments,
      missing_from_db: missingFromDb,
      from_cache: fromCache,
      cached_at: cachedAt,
      cache_incomplete: cacheIncomplete,
      cache_warning: cacheWarning,
    });

  } catch (error: any) {
    console.error("[reconcile] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reconcile" },
      { status: 500 }
    );
  }
}

// ========================================
// CSV FORMAT HANDLER
// ========================================
async function handleCsvFormat(supabase: any) {
  try {
    // Get cached Stripe subscriptions
    const { data: cachedData } = await supabaseAdmin
      .from("stripe_subscriptions_cache")
      .select("subscriptions_json")
      .eq("id", "latest")
      .single();

    const stripeEmailMap = new Map<string, { tier: string; amount: number; customer_id: string }>();

    if (cachedData?.subscriptions_json) {
      for (const sub of cachedData.subscriptions_json) {
        if (sub.email) {
          const tier = sub.amount === 1500 ? "Contributing" : "Founding";
          const amount = sub.amount / 100;
          const emailLower = sub.email.toLowerCase();
          if (!stripeEmailMap.has(emailLower)) {
            stripeEmailMap.set(emailLower, { tier, amount, customer_id: sub.customer || "" });
          }
        }
      }
    }

    // Fetch DB profiles for contributing/founding members
    const { data: dbProfiles } = await supabase
      .from("profiles")
      .select("email, membership_level")
      .in("membership_level", ["contributing", "founding"]);

    const dbEmailMap = new Map<string, { tier: string; amount: number }>();
    for (const profile of dbProfiles || []) {
      if (profile.email) {
        const emailLower = profile.email.toLowerCase();
        const tier = profile.membership_level === "founding" ? "Founding" : "Contributing";
        const amount = profile.membership_level === "founding" ? 100 : 15;
        if (!dbEmailMap.has(emailLower)) {
          dbEmailMap.set(emailLower, { tier, amount });
        }
      }
    }

    // Build CSV rows
    const csvRows: string[] = ["EMAIL,IN_STRIPE,IN_DB,STRIPE_TIER,DB_TIER,AMOUNT"];

    const allEmails = new Set<string>();
    for (const email of stripeEmailMap.keys()) allEmails.add(email);
    for (const email of dbEmailMap.keys()) allEmails.add(email);

    const rows: Array<{
      email: string;
      inStripe: boolean;
      inDb: boolean;
      stripeTier: string;
      dbTier: string;
      amount: string;
      isUnmatched: boolean;
    }> = [];

    for (const email of allEmails) {
      const stripeData = stripeEmailMap.get(email);
      const dbData = dbEmailMap.get(email);

      const inStripe = !!stripeData;
      const inDb = !!dbData;
      const isUnmatched = !!(inStripe !== inDb || (inStripe && dbData && stripeData?.tier !== dbData.tier));

      const stripeTier = stripeData?.tier || "-";
      const dbTier = dbData?.tier || "-";
      const amount = stripeData?.amount ? `$${stripeData.amount}` : (dbData?.amount ? `$${dbData.amount}` : "-");

      rows.push({ email, inStripe, inDb, stripeTier, dbTier, amount, isUnmatched });
    }

    // Sort: unmatched first, then alphabetically
    rows.sort((a, b) => {
      if (a.isUnmatched && !b.isUnmatched) return -1;
      if (!a.isUnmatched && b.isUnmatched) return 1;
      return a.email.localeCompare(b.email);
    });

    for (const row of rows) {
      const inStripe = row.inStripe ? "YES" : "NO";
      const inDb = row.inDb ? "YES" : "NO";
      csvRows.push(`${escapeCsvField(row.email)},${inStripe},${inDb},${row.stripeTier},${row.dbTier},${row.amount}`);
    }

    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="email-reconciliation-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });

  } catch (error: any) {
    console.error("[reconcile/csv] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate CSV" },
      { status: 500 }
    );
  }
}

function escapeCsvField(field: string): string {
  if (!field) return "";
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
