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
    // JSON FORMAT: Check cache first
    // ========================================

    // Check for cached Stripe live data in reconciliation_jobs
    const { data: cachedJob } = await supabaseAdmin
      .from("reconciliation_jobs")
      .select("*")
      .eq("job_type", "stripe_live")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const hasValidCache = cachedJob && (!cachedJob.expires_at || new Date(cachedJob.expires_at) > new Date());

    // If we have valid cached Stripe data, use it
    if (hasValidCache && cachedJob.stripe_live_json) {
      // Fetch our_db fresh (it's fast, no Stripe calls)
      const { data: allPayments } = await supabase
        .from("membership_payments")
        .select(`id, amount, user_id, profiles!inner(email, full_name)`)
        .in("amount", [15, 100])
        .limit(10000);

      // Calculate our DB totals
      const contributingUserIds = new Set<string>();
      const foundingUserIds = new Set<string>();
      for (const p of allPayments || []) {
        if (p.amount === 15) contributingUserIds.add(p.user_id);
        else if (p.amount === 100) foundingUserIds.add(p.user_id);
      }
      const dbContributingCount = contributingUserIds.size;
      const dbFoundingCount = foundingUserIds.size;
      const dbContributingTotal = dbContributingCount * 15;
      const dbFoundingTotal = dbFoundingCount * 100;

      const stripeLive = cachedJob.stripe_live_json;
      const stripeContributingCount = stripeLive.contributing?.count || 0;
      const stripeFoundingCount = stripeLive.founding?.count || 0;
      // Use nullish coalescing to handle true_total = 0 case properly
      const stripeContributingTotal = stripeLive.contributing?.true_total ?? stripeContributingCount * 15;
      const stripeFoundingTotal = stripeLive.founding?.true_total ?? stripeFoundingCount * 100;

      // Ensure true_total is always set in the returned stripeLive object
      if (stripeLive.contributing) {
        stripeLive.contributing.true_total = stripeContributingTotal;
      }
      if (stripeLive.founding) {
        stripeLive.founding.true_total = stripeFoundingTotal;
      }

      const ourDb = {
        contributing: { count: dbContributingCount, total: dbContributingTotal },
        founding: { count: dbFoundingCount, total: dbFoundingTotal },
        total: { count: dbContributingCount + dbFoundingCount, total: dbContributingTotal + dbFoundingTotal },
      };

      const difference = {
        contributing: { count: dbContributingCount - stripeContributingCount, total: dbContributingTotal - stripeContributingTotal },
        founding: { count: dbFoundingCount - stripeFoundingCount, total: dbFoundingTotal - stripeFoundingTotal },
        total: { count: (dbContributingCount + dbFoundingCount) - (stripeContributingCount + stripeFoundingCount), total: (dbContributingTotal + dbFoundingTotal) - (stripeContributingTotal + stripeFoundingTotal) },
      };

      // Also fetch payment_verify job for verified data
      const { data: paymentVerifyJob } = await supabaseAdmin
        .from("reconciliation_jobs")
        .select("*")
        .eq("job_type", "payment_verify")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Get verified data from payment_verify job if available and not expired
      let verified = { valid: 0, refunded: 0, failed: 0, not_found: 0 };
      let problematicPayments: any[] = [];
      if (paymentVerifyJob && (!paymentVerifyJob.expires_at || new Date(paymentVerifyJob.expires_at) > new Date())) {
        if (paymentVerifyJob.verified_payments_json) {
          verified = paymentVerifyJob.verified_payments_json.verified || verified;
        }
        problematicPayments = paymentVerifyJob.problematic_payments_json || [];
      }

      return NextResponse.json({
        summary: { stripe_live: stripeLive, our_db: ourDb, difference },
        verified,
        problematic_payments: problematicPayments,
        missing_from_db: cachedJob.missing_from_db || [],
        cached: true,
        cachedAt: cachedJob.completed_at,
      });
    }

    // ========================================
    // No cache - fetch fresh from Stripe
    // ========================================

    // Step 1: Get Stripe live stats
    let hasMore = true;
    let cursor;
    const allSubscriptions: Stripe.Subscription[] = [];

    while (hasMore) {
      const params: { limit: number; starting_after?: string; status: "active" | "past_due" | "canceled" | "unpaid" | "trialing" | "incomplete" | "incomplete_expired" | "paused" } = {
        limit: 100,
        status: "active",
      };
      if (cursor) params.starting_after = cursor;

      const response = await stripe.subscriptions.list(params as any);

      for (const sub of response.data) {
        const priceAmount = sub.items.data[0]?.price?.unit_amount;
        if (priceAmount !== 1500 && priceAmount !== 10000) continue;
        allSubscriptions.push(sub);
      }

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        cursor = response.data[response.data.length - 1].id;
      }
      await new Promise(r => setTimeout(r, 25));
    }

    // Calculate Stripe live totals (assumed based on count × price)
    let stripeContributingCount = 0;
    let stripeContributingTotal = 0;
    let stripeFoundingCount = 0;
    let stripeFoundingTotal = 0;

    // Also build stripeEmailMap for missing_from_db check
    const stripeEmailMap = new Map<string, { tier: string; amount: number; customer_id: string }>();

    for (const sub of allSubscriptions) {
      const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;
      if (amount === 15) {
        stripeContributingCount++;
        stripeContributingTotal += amount;
      } else if (amount === 100) {
        stripeFoundingCount++;
        stripeFoundingTotal += amount;
      }

      // Build stripeEmailMap for missing_from_db
      const priceAmount = sub.items.data[0]?.price?.unit_amount;
      if (priceAmount === 1500 || priceAmount === 10000) {
        const tier = priceAmount === 1500 ? "Contributing" : "Founding";
        const customerId = typeof sub.customer === 'string' ? sub.customer : null;
        const subAny = sub as any;
        let email = subAny.billing_details?.email || "";
        if (!email && customerId) {
          try {
            const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
            if (!customer.deleted && customer.email) {
              email = customer.email;
            }
          } catch (e) {}
          await new Promise(r => setTimeout(r, 25));
        }
        if (email) {
          const emailLower = email.toLowerCase();
          if (!stripeEmailMap.has(emailLower)) {
            stripeEmailMap.set(emailLower, { tier, amount, customer_id: customerId || "" });
          }
        }
      }
    }

    // Step 1c: Find emails in Stripe but not in any profile (paginate through all profiles)
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

    // Step 1b: Get TRUE totals from actual invoice amounts
    let trueContributingTotal = 0;
    let trueFoundingTotal = 0;

    for (const sub of allSubscriptions) {
      try {
        const customerId = typeof sub.customer === 'string' ? sub.customer : null;
        if (!customerId) continue;
        
        const invoices = await stripe.invoices.list({
          customer: customerId,
          limit: 100,
        });

        for (const invoice of invoices.data) {
          if (invoice.status === "paid") {
            const priceAmount = sub.items.data[0]?.price?.unit_amount;
            if (priceAmount === 1500) {
              trueContributingTotal += invoice.amount_paid / 100;
            } else if (priceAmount === 10000) {
              trueFoundingTotal += invoice.amount_paid / 100;
            }
          }
        }
      } catch (e) {
        console.error(`[reconcile] Error fetching invoices for customer ${sub.customer}:`, e);
      }
      await new Promise(r => setTimeout(r, 25));
    }

    const stripeLive = {
      contributing: { 
        count: stripeContributingCount, 
        total: stripeContributingTotal,
        true_total: trueContributingTotal 
      },
      founding: { 
        count: stripeFoundingCount, 
        total: stripeFoundingTotal,
        true_total: trueFoundingTotal 
      },
      total: { 
        count: stripeContributingCount + stripeFoundingCount, 
        total: stripeContributingTotal + stripeFoundingTotal,
        true_total: trueContributingTotal + trueFoundingTotal
      },
    };

    // Step 2: Get unique users per tier (count profiles, not payments)
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
      .in("amount", [15, 100])
      .limit(10000);

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
        total: dbContributingTotal + dbFoundingTotal 
      },
    };

    // Use allPayments for individual payment verification
    const payments = allPayments;

    // Calculate differences
    const difference = {
      contributing: { 
        count: dbContributingCount - stripeContributingCount, 
        total: dbContributingTotal - stripeContributingTotal 
      },
      founding: { 
        count: dbFoundingCount - stripeFoundingCount, 
        total: dbFoundingTotal - stripeFoundingTotal 
      },
      total: { 
        count: (dbContributingCount + dbFoundingCount) - (stripeContributingCount + stripeFoundingCount), 
        total: (dbContributingTotal + dbFoundingTotal) - (stripeContributingTotal + stripeFoundingTotal) 
      },
    };

    // Step 3: Verify each payment against Stripe
    const problematicPayments: any[] = [];
    const verifiedCount = { valid: 0, refunded: 0, failed: 0, not_found: 0 };

    for (const payment of payments || []) {
      // stripe_payment_id can be null for automatic payments (Stripe doesn't expose charge ID)
      // stripe_invoice_id is the fallback verification for automatic payments
      const hasStripeId = !!payment.stripe_payment_id;
      const hasInvoiceId = !!payment.stripe_invoice_id;

      if (!hasStripeId && !hasInvoiceId) {
        // Missing both Stripe IDs - can't verify
        problematicPayments.push({
          id: payment.id,
          stripe_payment_id: null,
          stripe_invoice_id: null,
          amount: payment.amount,
          email: (payment.profiles as any)?.email || "unknown",
          user_id: payment.user_id,
          created_at: payment.created_at,
          issue: "missing_stripe_id",
          stripe_status: null,
        });
        continue;
      }

      try {
        // Use stripe_payment_id if available, otherwise fall back to stripe_invoice_id
        const paymentId = payment.stripe_payment_id || payment.stripe_invoice_id;
        let status: string | null = null;

        if (paymentId?.startsWith("in_")) {
          // It's an invoice ID - use invoices API
          const invoice = await stripe.invoices.retrieve(paymentId);
          status = invoice.status === "paid" ? "succeeded" : invoice.status;
        } else if (paymentId?.startsWith("ch_")) {
          // It's a charge ID - use charges API
          const charge = await stripe.charges.retrieve(paymentId);
          status = charge.status;
        } else {
          // Unknown format - can't verify
          verifiedCount.not_found++;
          problematicPayments.push({
            id: payment.id,
            stripe_payment_id: payment.stripe_payment_id,
            amount: payment.amount,
            email: (payment.profiles as any)?.email || "unknown",
            user_id: payment.user_id,
            created_at: payment.created_at,
            issue: "unknown_id_format",
            stripe_status: null,
          });
          continue;
        }

        if (status === "succeeded") {
          verifiedCount.valid++;
        } else if (status === "refunded") {
          verifiedCount.refunded++;
          problematicPayments.push({
            id: payment.id,
            stripe_payment_id: payment.stripe_payment_id,
            amount: payment.amount,
            email: (payment.profiles as any)?.email || "unknown",
            user_id: payment.user_id,
            created_at: payment.created_at,
            issue: "refunded",
            stripe_status: "refunded",
          });
        } else if (status === "failed") {
          verifiedCount.failed++;
          problematicPayments.push({
            id: payment.id,
            stripe_payment_id: payment.stripe_payment_id,
            amount: payment.amount,
            email: (payment.profiles as any)?.email || "unknown",
            user_id: payment.user_id,
            created_at: payment.created_at,
            issue: "failed",
            stripe_status: "failed",
          });
        } else {
          // Any other status (e.g., "open" for invoices with failed payments)
          verifiedCount.not_found++;
          problematicPayments.push({
            id: payment.id,
            stripe_payment_id: payment.stripe_payment_id,
            amount: payment.amount,
            email: (payment.profiles as any)?.email || "unknown",
            user_id: payment.user_id,
            created_at: payment.created_at,
            issue: status || "unknown",
            stripe_status: status,
          });
        }
      } catch (stripeError: any) {
        // Payment not found in Stripe
        verifiedCount.not_found++;
        problematicPayments.push({
          id: payment.id,
          stripe_payment_id: payment.stripe_payment_id,
          amount: payment.amount,
          email: (payment.profiles as any)?.email || "unknown",
          user_id: payment.user_id,
          created_at: payment.created_at,
          issue: "not_found",
          stripe_status: null,
        });
      }

      // Rate limit - be nice to Stripe
      await new Promise(r => setTimeout(r, 50));
    }

    return NextResponse.json({
      summary: {
        stripe_live: stripeLive,
        our_db: ourDb,
        difference,
      },
      verified: verifiedCount,
      problematic_payments: problematicPayments,
      missing_from_db: missingFromDb,
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
    // Step 1: Fetch all Stripe subscriptions with emails
    const stripeEmailMap = new Map<string, { tier: string; amount: number; customer_id: string }>();

    let hasMore = true;
    let cursor;

    while (hasMore) {
      const params: { limit: number; starting_after?: string; status: "active" | "past_due" | "canceled" | "unpaid" | "trialing" | "incomplete" | "incomplete_expired" | "paused" } = {
        limit: 100,
        status: "active",
      };
      if (cursor) params.starting_after = cursor;

      const response = await stripe.subscriptions.list(params as any);

      for (const sub of response.data) {
        const priceAmount = sub.items.data[0]?.price?.unit_amount;
        if (priceAmount !== 1500 && priceAmount !== 10000) continue;

        const tier = priceAmount === 1500 ? "Contributing" : "Founding";
        const amount = priceAmount / 100;
        const customerId = typeof sub.customer === 'string' ? sub.customer : null;

        // Get email from subscription first
        const subAny = sub as any;
        let email = subAny.billing_details?.email || "";

        // If no email, fetch customer directly from Stripe
        if (!email && customerId) {
          try {
            const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
            if (!customer.deleted && customer.email) {
              email = customer.email;
            }
          } catch (e) {
            // Customer lookup failed
          }
          // Rate limit - be nice to Stripe
          await new Promise(r => setTimeout(r, 50));
        }

        if (email) {
          const emailLower = email.toLowerCase();
          // Only add if not already present (first occurrence wins)
          if (!stripeEmailMap.has(emailLower)) {
            stripeEmailMap.set(emailLower, { tier, amount, customer_id: customerId || "" });
          }
        }
      }

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        cursor = response.data[response.data.length - 1].id;
      }
      await new Promise(r => setTimeout(r, 25));
    }

    // Step 2: Fetch DB profiles for contributing/founding members
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
        // Only add if not already present
        if (!dbEmailMap.has(emailLower)) {
          dbEmailMap.set(emailLower, { tier, amount });
        }
      }
    }

    // Step 3: Build CSV rows
    const csvRows: string[] = ["EMAIL,IN_STRIPE,IN_DB,STRIPE_TIER,DB_TIER,AMOUNT"];

    // Collect all unique emails
    const allEmails = new Set<string>();
    for (const email of stripeEmailMap.keys()) allEmails.add(email);
    for (const email of dbEmailMap.keys()) allEmails.add(email);

    // Build rows with match status
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

      rows.push({
        email,
        inStripe,
        inDb,
        stripeTier,
        dbTier,
        amount,
        isUnmatched,
      });
    }

    // Sort: unmatched first, then alphabetically by email
    rows.sort((a, b) => {
      if (a.isUnmatched && !b.isUnmatched) return -1;
      if (!a.isUnmatched && b.isUnmatched) return 1;
      return a.email.localeCompare(b.email);
    });

    // Build CSV
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
  // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
