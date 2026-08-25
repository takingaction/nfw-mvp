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

// Hardcoded subscriber data from user
const subscribers = [
  { email: "whitneysmurphy@gmail.com", customerId: "cus_V6xz0Xq12pD2pb" },
  { email: "pipe.ashley@gmail.com", customerId: "cus_V4aFuecUYimgj0" },
  { email: "danielle.cornish.avl@gmail.com", customerId: "cus_V3UnW3Ei1Ffr6p" },
  { email: "rosehandelman@gmail.com", customerId: "cus_V227P3CSef0KQY" },
  { email: "becknavarrete73@yahoo.com", customerId: "cus_UyzZX0BJuV83gJ" },
  { email: "chalitaj221@gmail.com", customerId: "cus_UxOFDm7MsrURIL" },
  { email: "espinozakimberly.0826@gmail.com", customerId: "cus_UwfUUfRcD8J3IY" },
  { email: "kenneshamoore@yahoo.com", customerId: "cus_Uvgv1kxMD2EDWD" },
  { email: "yjdgreen@gmail.com", customerId: "cus_UumLGIwsblnX1F" },
  { email: "ferraroluxebuilders@gmail.com", customerId: "cus_UtKCVNOpGH7bbg" },
  { email: "nealroddie.courtney@gmail.com", customerId: "cus_UtJt4ZtU7xgCvL" },
  { email: "grahmamelie@gmail.com", customerId: "cus_UsLTpbPxRPkhds" },
  { email: "abbygaylegbritton@gmail.com", customerId: "cus_UrZHpNREeBpJKM" },
  { email: "levi@speakwright.org", customerId: "cus_UqLtnwFa0HRuIR" },
  { email: "kandersonxx@yahoo.com", customerId: "cus_Uq05nqs5YubecR" },
  { email: "msmehvishkhan@gmail.com", customerId: "cus_UpXbkeQYIueKUr" },
  { email: "michelle@nationalfundforwomen.org", customerId: "cus_UZAzVTh5ALEdoJ" },
];

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

    // Step 1: Get existing known payment IDs from membership_payments
    const { data: existingPayments } = await supabaseAdmin
      .from("membership_payments")
      .select("stripe_payment_id, user_id");

    const knownPaymentIds = new Set(existingPayments?.map(p => p.stripe_payment_id) || []);

    // Step 2: Get existing stripe_backfill_status entries
    const { data: existingBackfill } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("stripe_customer_id, status");

    const existingCustomerIds = new Set(existingBackfill?.map(b => b.stripe_customer_id) || []);

    // Step 3: Get profile IDs by email
    const emails = subscribers.map(s => s.email);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("email", emails);

    const profileIdByEmail = new Map<string, string>();
    for (const p of profiles || []) {
      profileIdByEmail.set(p.email, p.id);
    }

    // Step 4: For each subscriber, link customer ID and record missing payments
    const results: {
      linked: number;
      alreadyLinked: number;
      paymentsInserted: number;
      paymentsSkipped: number;
      errors: string[];
      kandersonxx: Record<string, unknown> | null;
    } = {
      linked: 0,
      alreadyLinked: 0,
      paymentsInserted: 0,
      paymentsSkipped: 0,
      errors: [],
      kandersonxx: null,
    };

    for (const sub of subscribers) {
      try {
        const profileId = profileIdByEmail.get(sub.email);

        // Update stripe_backfill_status
        if (!existingCustomerIds.has(sub.customerId)) {
          const { error: insertError } = await supabaseAdmin
            .from("stripe_backfill_status")
            .insert({
              email: sub.email,
              stripe_customer_id: sub.customerId,
              status: "matched",
              processed_at: new Date().toISOString(),
            });

          if (insertError) {
            results.errors.push(`Failed to insert backfill status for ${sub.email}: ${insertError.message}`);
          } else {
            results.linked++;
          }
        } else {
          results.alreadyLinked++;
        }

        // For kandersonxx - just report what we find, don't create profile
        if (sub.email === "kandersonxx@yahoo.com") {
          try {
            const customer = await stripe.customers.retrieve(sub.customerId) as Stripe.Customer;
            const subscriptions = await stripe.subscriptions.list({
              customer: sub.customerId,
              limit: 10,
            });

            results.kandersonxx = {
              email: sub.email,
              customerId: sub.customerId,
              stripeEmail: customer.email,
              stripeName: customer.name,
              subscriptions: subscriptions.data.map(s => ({
                id: s.id,
                status: s.status,
                amount: (s.items.data[0]?.price?.unit_amount || 0) / 100,
                interval: s.items.data[0]?.price?.recurring?.interval,
                currentPeriodStart: (s as any).current_period_start
                  ? new Date((s as any).current_period_start * 1000).toISOString()
                  : null,
              })),
            };
          } catch (err) {
            results.kandersonxx = {
              email: sub.email,
              customerId: sub.customerId,
              error: err instanceof Error ? err.message : "Unknown error",
            };
          }
          continue; // Skip payment recording for non-profile subscriber
        }

        // Skip if no profile found
        if (!profileId) {
          results.errors.push(`No profile found for ${sub.email}`);
          continue;
        }

        // Get all charges for this customer
        try {
          const charges = await stripe.charges.list({
            customer: sub.customerId,
            limit: 100,
          });

          // Filter for $15 membership payments
          for (const charge of charges.data) {
            if (charge.status !== "succeeded") continue;
            const amt = charge.amount / 100;
            if (amt !== 15) continue; // Only $15 contributing

            if (knownPaymentIds.has(charge.id)) {
              results.paymentsSkipped++;
              continue;
            }

            // Insert payment
            const { error: insertError } = await supabaseAdmin
              .from("membership_payments")
              .insert({
                user_id: profileId,
                amount: amt,
                payment_type: "signup",
                stripe_payment_id: charge.id,
                stripe_invoice_id: (charge as any).invoice as string || null,
                created_at: new Date(charge.created * 1000).toISOString(),
              });

            if (insertError) {
              results.errors.push(`Failed to insert payment for ${sub.email}: ${insertError.message}`);
            } else {
              results.paymentsInserted++;
              knownPaymentIds.add(charge.id);
            }
          }
        } catch (e) {
          results.errors.push(`Failed to get charges for ${sub.email}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }

      } catch (e) {
        results.errors.push(`Error processing ${sub.email}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }

      // Rate limit to avoid Stripe API limits
      await new Promise(r => setTimeout(r, 50));
    }

    return NextResponse.json({
      success: true,
      message: `Linked ${results.linked} customers, inserted ${results.paymentsInserted} payments`,
      ...results,
    });

  } catch (error) {
    console.error("[link-subscribers] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to link subscribers" },
      { status: 500 }
    );
  }
}