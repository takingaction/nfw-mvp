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

    // Get paid profile emails DIRECTLY with a JOIN query
    const { data: paidProfiles, error: paidError } = await supabaseAdmin
      .from("membership_payments")
      .select(`
        amount,
        profiles(email)
      `)
      .in("amount", [15, 100]);

    if (paidError) {
      return NextResponse.json({ error: paidError.message }, { status: 500 });
    }

    // Build paid emails set
    const paidProfileEmails = new Set<string>();
    for (const p of paidProfiles || []) {
      const email = (p.profiles as any)?.email?.toLowerCase().trim();
      if (email) {
        paidProfileEmails.add(email);
      }
    }

    const dbContributingCount = paidProfiles?.filter(p => p.amount === 15).length || 0;
    const dbFoundingCount = paidProfiles?.filter(p => p.amount === 100).length || 0;

    // Get all Stripe subscription emails
    const stripeEmailsByTier = {
      contributing: new Set<string>(),
      founding: new Set<string>(),
    };

    const stripeCustomerInfo = {
      contributing: new Map<string, { name: string; customer_id: string }>(),
      founding: new Map<string, { name: string; customer_id: string }>(),
    };

    const statuses = ["active", "past_due", "canceled", "unpaid", "trialing", "incomplete", "incomplete_expired", "paused"];

    for (const status of statuses) {
      let hasMore = true;
      let cursor: string | undefined;

      while (hasMore) {
        const params: any = { limit: 100, status };
        if (cursor) params.starting_after = cursor;

        const response = await stripe.subscriptions.list(params as any);
        hasMore = response.has_more;

        if (response.data.length > 0) {
          cursor = response.data[response.data.length - 1].id;
        }

        for (const sub of response.data) {
          const priceAmount = sub.items.data[0]?.price?.unit_amount;
          if (priceAmount !== 1500 && priceAmount !== 10000) continue;

          const tier = priceAmount === 1500 ? "contributing" : "founding";

          const subAny = sub as any;
          let email = subAny.billing_details?.email || "";
          let name = subAny.billing_details?.name || "";

          if (!email) {
            try {
              const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
              if (!customer.deleted && customer.email) {
                email = customer.email;
                name = customer.name || "";
              }
            } catch {}
          }

          if (!email) continue;

          const emailLower = email.toLowerCase().trim();
          stripeEmailsByTier[tier].add(emailLower);
          stripeCustomerInfo[tier].set(emailLower, {
            name,
            customer_id: sub.customer as string,
          });

          await new Promise(r => setTimeout(r, 25));
        }
      }
    }

    // Find missing - emails in Stripe but NOT in paidProfileEmails
    // Then look up their profile_id by email
    const missingContributing: any[] = [];
    const missingFounding: any[] = [];

    // Get all profiles to look up profile_id by email
    const { data: allProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email");

    const profileIdByEmail = new Map<string, string>();
    for (const p of allProfiles || []) {
      if (p.email) {
        profileIdByEmail.set(p.email.toLowerCase().trim(), p.id);
      }
    }

    for (const email of stripeEmailsByTier.contributing) {
      if (!paidProfileEmails.has(email)) {
        const info = stripeCustomerInfo.contributing.get(email)!;
        const profile_id = profileIdByEmail.get(email) || null;
        missingContributing.push({
          email,
          name: info.name,
          stripe_customer_id: info.customer_id,
          amount: 15,
          profile_id,
        });
      }
    }

    for (const email of stripeEmailsByTier.founding) {
      if (!paidProfileEmails.has(email)) {
        const info = stripeCustomerInfo.founding.get(email)!;
        const profile_id = profileIdByEmail.get(email) || null;
        missingFounding.push({
          email,
          name: info.name,
          stripe_customer_id: info.customer_id,
          amount: 100,
          profile_id,
        });
      }
    }

    missingContributing.sort((a, b) => a.email.localeCompare(b.email));
    missingFounding.sort((a, b) => a.email.localeCompare(b.email));

    return NextResponse.json({
      contributing: missingContributing,
      founding: missingFounding,
      summary: {
        contributing_count: missingContributing.length,
        founding_count: missingFounding.length,
        total_count: missingContributing.length + missingFounding.length,
        stripe_contributing: stripeEmailsByTier.contributing.size,
        stripe_founding: stripeEmailsByTier.founding.size,
        db_contributing: dbContributingCount,
        db_founding: dbFoundingCount,
        paid_emails_count: paidProfileEmails.size,
      },
    });

  } catch (error) {
    console.error("[missing-payments] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get missing payments" },
      { status: 500 }
    );
  }
}
