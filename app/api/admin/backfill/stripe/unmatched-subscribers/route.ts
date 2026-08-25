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

export async function POST(request: Request) {
  void request; // Required by Next.js but not used

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

    // Get all matched Stripe customer IDs (812 customers in our database)
    const { data: backfillMatched } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("stripe_customer_id")
      .eq("status", "matched");

    const matchedCustomerIds = new Set<string>();
    for (const b of backfillMatched || []) {
      if (b.stripe_customer_id) {
        matchedCustomerIds.add(b.stripe_customer_id);
      }
    }

    // Fetch all active subscriptions with $15 or $100 price
    const subscriptions: {
      email: string;
      name: string;
      amount: number;
      interval: string;
      subscription_id: string;
      customer_id: string;
      current_period_start: string;
      status: string;
    }[] = [];

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
        // Get the price - check for $15 (1500) or $100 (10000) amounts
        const priceAmount = sub.items.data[0]?.price?.unit_amount;

        if (priceAmount !== 1500 && priceAmount !== 10000) continue;

        // Skip if customer is in our matched set (812 customers in DB)
        if (matchedCustomerIds.has(sub.customer as string)) continue;

        // Get email from billing details first
        const subAny = sub as any;
        let email = subAny.billing_details?.email || "";
        let name = subAny.billing_details?.name || "";

        // If no billing email, fetch customer directly from Stripe
        if (!email) {
          try {
            const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
            if (!customer.deleted && customer.email) {
              email = customer.email;
              name = customer.name || "";
            }
          } catch {
            // Customer lookup failed, try invoice as fallback
          }
        }

        // If still no email, try latest invoice
        if (!email && sub.latest_invoice) {
          try {
            const invoice = await stripe.invoices.retrieve(sub.latest_invoice as string) as Stripe.Invoice;
            if (invoice.billing_reason === 'subscription' && invoice.customer_email) {
              email = invoice.customer_email;
            }
          } catch {
            // Invoice lookup failed
          }
        }

        subscriptions.push({
          email,
          name,
          amount: priceAmount / 100,
          interval: sub.items.data[0]?.price?.recurring?.interval || "month",
          subscription_id: sub.id,
          customer_id: sub.customer as string,
          current_period_start: subAny.current_period_start
            ? new Date(subAny.current_period_start * 1000).toISOString()
            : "",
          status: sub.status,
        });
      }

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        cursor = response.data[response.data.length - 1].id;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 25));
    }

    // Sort by current_period_start descending (newest first)
    subscriptions.sort((a, b) => {
      const aTime = a.current_period_start ? new Date(a.current_period_start).getTime() : 0;
      const bTime = b.current_period_start ? new Date(b.current_period_start).getTime() : 0;
      return bTime - aTime;
    });

    // Generate CSV
    const csvHeader = "email,name,amount,interval,subscription_id,customer_id,current_period_start,status\n";

    const csvRows = subscriptions.map(sub => {
      const email = escapeCsvField(sub.email);
      const name = escapeCsvField(sub.name);
      const amount = sub.amount.toFixed(2);
      const interval = sub.interval;
      const subscription_id = sub.subscription_id;
      const customer_id = sub.customer_id;
      const current_period_start = sub.current_period_start.split('T')[0];
      const status = sub.status;

      return `${email},${name},${amount},${interval},${subscription_id},${customer_id},${current_period_start},${status}`;
    }).join("\n");

    const csv = csvHeader + csvRows;

    const totalAmount = subscriptions.reduce((s, sub) => s + sub.amount, 0);

    return NextResponse.json({
      count: subscriptions.length,
      total_amount: totalAmount,
      subscriptions,
      csv,
    });

  } catch (error) {
    console.error("[unmatched-subscribers] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get unmatched subscribers" },
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