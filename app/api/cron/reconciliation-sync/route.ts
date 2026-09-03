import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

// Stripe API call with retry and exponential backoff
async function stripeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && attempt < maxRetries - 1) {
        const retryAfter = parseInt(error.headers?.['retry-after'] || '5');
        const delay = Math.max(retryAfter * 1000, baseDelayMs * Math.pow(2, attempt));
        console.log(`[reconciliation-sync] Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[reconciliation-sync] Starting Stripe subscriptions fetch...");

    let stripeApiCalls = 0;
    let hasMore = true;
    let cursor;
    const allSubscriptions: any[] = [];
    let incomplete = false;
    let warning: string | undefined;

    // Fetch all active subscriptions with pagination and retry
    while (hasMore) {
      try {
        const params: any = {
          limit: 100,
          status: "active",
        };
        if (cursor) params.starting_after = cursor;

        const response = await stripeWithRetry(() =>
          stripe.subscriptions.list(params)
        );
        stripeApiCalls++;

        for (const sub of response.data) {
          const priceAmount = sub.items.data[0]?.price?.unit_amount;
          // Only store $15 and $100 subscriptions
          if (priceAmount === 1500 || priceAmount === 10000) {
            allSubscriptions.push({
              id: sub.id,
              customer: typeof sub.customer === 'string' ? sub.customer : null,
              status: sub.status,
              amount: priceAmount,
              email: (sub as any).billing_details?.email || null,
              created: sub.created,
              current_period_start: sub.current_period_start,
              current_period_end: sub.current_period_end,
            });
          }
        }

        hasMore = response.has_more;
        if (hasMore && response.data.length > 0) {
          cursor = response.data[response.data.length - 1].id;
        }

        // Be nice to Stripe - wait between pages
        await new Promise(r => setTimeout(r, 100));
      } catch (err: any) {
        console.error(`[reconciliation-sync] Error fetching subscriptions:`, err.message);
        incomplete = true;
        warning = `Incomplete data due to error: ${err.message}`;
        hasMore = false;
      }
    }

    console.log(`[reconciliation-sync] Fetched ${allSubscriptions.length} subscriptions (${stripeApiCalls} API calls)`);

    // Calculate counts from cached subscriptions
    let stripeContributingCount = 0;
    let stripeContributingTotal = 0;
    let stripeFoundingCount = 0;
    let stripeFoundingTotal = 0;

    for (const sub of allSubscriptions) {
      if (sub.amount === 1500) {
        stripeContributingCount++;
        stripeContributingTotal += 15;
      } else if (sub.amount === 10000) {
        stripeFoundingCount++;
        stripeFoundingTotal += 100;
      }
    }

    const stripeLive = {
      contributing: { count: stripeContributingCount, total: stripeContributingTotal },
      founding: { count: stripeFoundingCount, total: stripeFoundingTotal },
      total: {
        count: stripeContributingCount + stripeFoundingCount,
        total: stripeContributingTotal + stripeFoundingTotal,
      },
    };

    // Store raw subscriptions in cache
    const { error: cacheError } = await supabaseAdmin
      .from("stripe_subscriptions_cache")
      .upsert({
        id: "latest",
        subscriptions_json: allSubscriptions,
        fetched_at: new Date().toISOString(),
        subscription_count: allSubscriptions.length,
        api_calls: stripeApiCalls,
        incomplete,
        warning,
      });

    if (cacheError) {
      console.error("[reconciliation-sync] Error caching subscriptions:", cacheError);
    }

    console.log(`[reconciliation-sync] Complete. Stored ${allSubscriptions.length} subscriptions in cache`);

    return NextResponse.json({
      success: true,
      subscriptions_fetched: allSubscriptions.length,
      stripe_live: stripeLive,
      api_calls: stripeApiCalls,
      incomplete,
      warning,
      cached_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[reconciliation-sync] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
