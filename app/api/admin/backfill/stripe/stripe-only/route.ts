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

    // Step 2: Get ALL Stripe subscriptions with their customer IDs
    // Then fetch charges for each subscription with proper batching
    const allCharges: StripeCharge[] = [];
    const processedChargeIds = new Set<string>();
    const customerChargeCache = new Map<string, StripeCharge[]>();

    // Get all subscription customer IDs first (no charge fetching yet)
    const allCustomerIds: string[] = [];
    const statuses: Array<"active" | "past_due" | "canceled" | "unpaid" | "trialing" | "incomplete" | "incomplete_expired" | "paused"> =
      ["active", "past_due", "canceled", "unpaid", "trialing", "incomplete", "incomplete_expired", "paused"];

    console.log(`[stripe-only] Fetching all subscription customer IDs...`);

    for (const status of statuses) {
      let subHasMore = true;
      let subCursor: string | undefined;
      let pageNum = 0;

      while (subHasMore) {
        pageNum++;
        try {
          const subParams: any = { limit: 100, status };
          if (subCursor) subParams.starting_after = subCursor;

          // Add delay between subscription list calls
          await new Promise(r => setTimeout(r, 200));

          const subsResponse = await stripe.subscriptions.list(subParams as any);
          subHasMore = subsResponse.has_more;

          if (subsResponse.data.length > 0) {
            subCursor = subsResponse.data[subsResponse.data.length - 1].id;

            for (const sub of subsResponse.data) {
              if (sub.customer && !allCustomerIds.includes(sub.customer as string)) {
                allCustomerIds.push(sub.customer as string);
              }
            }
          }

          console.log(`[stripe-only] Status ${status}, page ${pageNum}: ${allCustomerIds.length} customers so far`);
        } catch (err: any) {
          console.error(`[stripe-only] Error listing subscriptions (${status}):`, err.message);
          subHasMore = false;
        }
      }
    }

    console.log(`[stripe-only] Total unique customers: ${allCustomerIds.length}`);

    // Now fetch charges for each customer in batches with rate limiting
    // Process in chunks of 20 customers, with delay between each customer
    const BATCH_SIZE = 20;
    const DELAY_BETWEEN_CUSTOMERS = 500; // 500ms between each customer to avoid rate limits

    for (let i = 0; i < allCustomerIds.length; i += BATCH_SIZE) {
      const batch = allCustomerIds.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allCustomerIds.length / BATCH_SIZE);

      console.log(`[stripe-only] Processing batch ${batchNum}/${totalBatches} (${batch.length} customers)`);

      for (const customerId of batch) {
        // Add delay between each customer's charges.list() call
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_CUSTOMERS));

        try {
          const charges = await stripe.charges.list({
            customer: customerId,
            limit: 100,
          });

          for (const charge of charges.data) {
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
        } catch (err: any) {
          // Log but continue - we don't want to fail the whole export for one bad customer
          console.warn(`[stripe-only] Error fetching charges for customer ${customerId}:`, err.message);
        }
      }

      // Extra delay between batches
      if (i + BATCH_SIZE < allCustomerIds.length) {
        await new Promise(r => setTimeout(r, 1000));
      }

      console.log(`[stripe-only] Batch ${batchNum} complete: ${allCharges.length} membership charges found`);
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