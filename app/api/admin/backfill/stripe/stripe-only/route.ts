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

interface StripeCharge {
  id: string;
  customer: string;
  amount: number;
  currency: string;
  created: number;
  billing_details?: {
    email?: string | null;
    name?: string | null;
  };
}

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

    // Step 1: Get ALL profile emails using pagination
    const allProfiles: any[] = [];
    let pageStart = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: profilesPage, error } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .range(pageStart, pageStart + pageSize - 1);

      if (error) {
        console.error("[stripe-only] Error fetching profiles:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (profilesPage && profilesPage.length > 0) {
        allProfiles.push(...profilesPage);
        pageStart += pageSize;
      }

      hasMore = profilesPage && profilesPage.length === pageSize;
    }

    // Build email → profile map (case-insensitive)
    const profileByEmail = new Map<string, any>();
    for (const profile of allProfiles) {
      if (profile.email) {
        profileByEmail.set(profile.email.toLowerCase(), profile);
      }
    }

    console.log(`[stripe-only] Profiles loaded: ${allProfiles.length}`);
    console.log(`[stripe-only] Emails in map: ${profileByEmail.size}`);

    // Step 2: Get ALL Stripe charges (15/100 amounts) directly from charges.list()
    // This is MUCH more efficient than iterating through subscriptions
    // Instead of N API calls (one per subscription), we make ~38 calls (one per 100 charges)
    const allCharges: StripeCharge[] = [];
    const processedChargeIds = new Set<string>();
    const MEMBERSHIP_CREATED_AFTER = Math.floor(new Date("2026-01-01").getTime() / 1000);

    let chargeHasMore = true;
    let chargeCursor: string | undefined;

    while (chargeHasMore) {
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Add 250ms delay between charge list calls to avoid rate limits
          await new Promise(r => setTimeout(r, 250));

          const chargeParams: any = {
            limit: 100,
            created: { gte: MEMBERSHIP_CREATED_AFTER },
          };
          if (chargeCursor) chargeParams.starting_after = chargeCursor;

          const chargesResponse = await stripe.charges.list(chargeParams);
          chargeHasMore = chargesResponse.has_more;

          if (chargesResponse.data.length > 0) {
            chargeCursor = chargesResponse.data[chargesResponse.data.length - 1].id;
          }

          for (const charge of chargesResponse.data) {
            // Only membership amounts ($15 = 1500, $100 = 10000), avoid duplicates
            if ((charge.amount === 1500 || charge.amount === 10000) && !processedChargeIds.has(charge.id)) {
              processedChargeIds.add(charge.id);
              allCharges.push({
                id: charge.id,
                customer: charge.customer as string,
                amount: charge.amount,
                currency: charge.currency,
                created: charge.created,
                billing_details: charge.billing_details,
              });
            }
          }

          console.log(`[stripe-only] Charges fetched so far: ${allCharges.length}, has_more: ${chargeHasMore}`);
          break; // Success, exit retry loop

        } catch (err: any) {
          if (err.type === 'StripeRateLimitError' || err.statusCode === 429) {
            retryCount++;
            console.warn(`Rate limited fetching charges, retry ${retryCount}/${maxRetries}`);
            // Exponential backoff: 500ms, 1000ms, 2000ms
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, retryCount - 1)));
          } else {
            // Non-rate-limit error, log and continue
            console.error(`Error fetching charges:`, err.message);
            chargeHasMore = false;
            break;
          }
        }
      }

      if (retryCount >= maxRetries) {
        console.error(`Failed after ${maxRetries} retries for charges, stopping pagination`);
        chargeHasMore = false;
      }
    }

    console.log(`[stripe-only] Total unique Stripe charges found: ${allCharges.length}`);

    // DEBUG: Show sample data
    const profileEmailSamples = Array.from(profileByEmail.keys()).slice(0, 5);
    console.log(`[stripe-only] Profile email samples:`, profileEmailSamples);
    const chargeEmailSamples = allCharges.slice(0, 5).map(c => c.billing_details?.email);
    console.log(`[stripe-only] Charge email samples:`, chargeEmailSamples);
    const nullEmailCount = allCharges.filter(c => !c.billing_details?.email).length;
    console.log(`[stripe-only] Charges with NULL emails: ${nullEmailCount}`);

    // Step 3: Find charges where the email is NOT in our profiles table
    const stripeOnlyCharges: any[] = [];
    let matchCount = 0;
    let noMatchCount = 0;

    for (const charge of allCharges) {
      const chargeEmail = charge.billing_details?.email?.toLowerCase();
      
      // Check if billing email matches any profile
      if (chargeEmail && profileByEmail.has(chargeEmail)) {
        matchCount++;
        continue; // Person IS in our DB
      }

      // If we get here, the person is NOT in our profiles table
      noMatchCount++;
      stripeOnlyCharges.push({
        charge_id: charge.id,
        customer_id: charge.customer,
        email: charge.billing_details?.email || null,
        name: charge.billing_details?.name || null,
        amount: charge.amount / 100,
        currency: charge.currency,
        created: new Date(charge.created * 1000).toISOString(),
      });
    }

    console.log(`[stripe-only] Matched by email: ${matchCount}`);
    console.log(`[stripe-only] NO MATCH (Stripe Only): ${noMatchCount}`);

    // Sort by date, newest first
    stripeOnlyCharges.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    const total = stripeOnlyCharges.reduce((sum, c) => sum + c.amount, 0);

    return NextResponse.json({
      charges: stripeOnlyCharges,
      count: stripeOnlyCharges.length,
      total: total,
    });

  } catch (error: any) {
    console.error("[stripe-only] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get Stripe Only charges" },
      { status: 500 }
    );
  }
}