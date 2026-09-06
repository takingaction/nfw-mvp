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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
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
        console.error("[all-transactions] Error fetching profiles:", error);
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

    console.log(`[all-transactions] Profiles loaded: ${allProfiles.length}`);

    // Step 2: Get ALL Stripe charges (15/100 amounts) from ALL subscriptions
    const allCharges: StripeCharge[] = [];
    const processedChargeIds = new Set<string>();

    // Get ALL subscription statuses
    const statuses: Array<"active" | "past_due" | "canceled" | "unpaid" | "trialing" | "incomplete" | "incomplete_expired" | "paused"> = 
      ["active", "past_due", "canceled", "unpaid", "trialing", "incomplete", "incomplete_expired", "paused"];

    for (const status of statuses) {
      let subscriptionHasMore = true;
      let cursor: string | undefined;

      while (subscriptionHasMore) {
        const params: any = {
          limit: 100,
          status,
        };
        if (cursor) params.starting_after = cursor;

        try {
          const response = await stripe.subscriptions.list(params as any);
          subscriptionHasMore = response.has_more;
          
          if (response.data.length > 0) {
            cursor = response.data[response.data.length - 1].id;
          }

          // For each subscription, get charges
          for (const sub of response.data) {
            try {
              const charges = await stripe.charges.list({
                customer: sub.customer as string,
                limit: 100,
              });

              for (const charge of charges.data) {
                // Only membership amounts, avoid duplicates
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
            } catch (err) {
              console.error(`Error fetching charges for customer ${sub.customer}:`, err);
            }

            await new Promise(r => setTimeout(r, 25));
          }
        } catch (err) {
          console.error(`Error listing subscriptions (${status}):`, err);
        }
      }
    }

    console.log(`[all-transactions] Total unique Stripe charges found: ${allCharges.length}`);

    // Step 3: Build CSV with match info
    const headers = [
      "Charge ID",
      "Customer ID",
      "Email",
      "Name",
      "Amount",
      "Currency",
      "Date",
      "In Our DB",
      "Profile ID"
    ];

    const rows = allCharges.map((charge) => {
      const chargeEmail = charge.billing_details?.email?.toLowerCase();
      const matchedProfile = chargeEmail ? profileByEmail.get(chargeEmail) : null;
      const inOurDb = matchedProfile ? "Yes" : "No";
      const profileId = matchedProfile ? matchedProfile.id : "";

      return [
        charge.id,
        charge.customer,
        charge.billing_details?.email || "",
        charge.billing_details?.name || "",
        (charge.amount / 100).toFixed(2),
        charge.currency,
        new Date(charge.created * 1000).toISOString(),
        inOurDb,
        profileId
      ];
    });

    // Sort by date, newest first
    rows.sort((a, b) => new Date(b[6]).getTime() - new Date(a[6]).getTime());

    const csv = [
      headers.join(","),
      ...rows.map((r: string[]) => r.map(field => `"${field.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const date = new Date().toISOString().split("T")[0];
    const filename = `nfw-all-stripe-transactions-${date}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error("[all-transactions] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export transactions" },
      { status: 500 }
    );
  }
}