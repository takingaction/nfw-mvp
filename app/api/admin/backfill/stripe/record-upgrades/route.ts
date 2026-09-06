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

interface UpgradeRecord {
  user_id: string;
  from_level: string;
  to_level: string;
  amount: number;
  stripe_payment_id: string | null;
  created_at?: string;
}

interface ResyncRecord {
  profile_id: string;
  email: string;
}

interface RecordUpgradesRequest {
  upgrades: UpgradeRecord[];
  resync?: ResyncRecord[];
}

async function syncCustomerPayments(stripeCustomerId: string, profileId: string | null) {
  // Fetch all invoices for this customer
  const invoices: Stripe.Invoice[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params: { customer: string; limit: number; starting_after?: string } = {
      customer: stripeCustomerId,
      limit: 100,
    };
    if (startingAfter) {
      params.starting_after = startingAfter;
    }

    const response = await stripe.invoices.list(params);
    invoices.push(...response.data);

    hasMore = response.has_more;
    if (hasMore && response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }

    await new Promise(r => setTimeout(r, 25));
  }

  // Process invoices
  const allPayments = [];
  let totalAmount = 0;
  let latestSucceededPayment: { date: string; amount: number; status: string } | null = null;

  for (const invoice of invoices) {
    const amount = invoice.amount_paid / 100;
    const status = invoice.status;
    const date = new Date(invoice.created * 1000).toISOString();

    const paymentType = invoice.billing_reason === "subscription_create" ? "signup" :
                       invoice.billing_reason === "subscription_cycle" ? "renewal" :
                       invoice.billing_reason === "subscription_update" ? "upgrade" : "renewal";

    if (status === "paid") {
      totalAmount += amount;
      if (!latestSucceededPayment || new Date(date) > new Date(latestSucceededPayment.date)) {
        latestSucceededPayment = { date, amount, status };
      }
    }

    const chargeId = (invoice as any).charge;
    const stripePaymentId = typeof chargeId === 'string' ? chargeId : null;

    allPayments.push({
      id: invoice.id,
      amount,
      status,
      date,
      billing_reason: invoice.billing_reason,
      stripe_invoice_id: invoice.id,
      stripe_payment_id: stripePaymentId,
      payment_type: paymentType,
    });
  }

  // Sort by date descending
  allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    payment_count: allPayments.length,
    total_amount: totalAmount,
    has_failed: false,
    has_refunded: false,
    latest_payment_date: latestSucceededPayment?.date || null,
    latest_payment_status: latestSucceededPayment?.status || null,
    latest_payment_amount: latestSucceededPayment?.amount || null,
    latest_payment_error: null,
    all_payments_json: allPayments,
  };
}

async function insertMembershipPaymentsIfNeeded(profileId: string | null, allPaymentsJson: any[]) {
  if (!profileId) return { inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;

  for (const payment of allPaymentsJson) {
    if (payment.status !== "paid") {
      skipped++;
      continue;
    }

    const invoiceId = payment.stripe_invoice_id;
    if (!invoiceId) {
      skipped++;
      continue;
    }

    const { data: existing } = await supabaseAdmin
      .from("membership_payments")
      .select("id")
      .eq("stripe_invoice_id", invoiceId)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    const paymentType = payment.billing_reason === "subscription_create" ? "signup" :
                       payment.billing_reason === "subscription_cycle" ? "renewal" :
                       payment.billing_reason === "subscription_update" ? "upgrade" : "renewal";

    const { error: insertError } = await supabaseAdmin
      .from("membership_payments")
      .insert({
        user_id: profileId,
        amount: payment.amount,
        payment_type: paymentType,
        stripe_payment_id: payment.stripe_payment_id,
        stripe_invoice_id: invoiceId,
        created_at: payment.date,
      });

    if (insertError) {
      console.error(`[record-upgrades] Failed to insert payment ${invoiceId}:`, insertError.message);
      skipped++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped };
}

export async function POST(request: Request) {
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

    const body: RecordUpgradesRequest = await request.json();

    const results: {
      upgrades: { success: boolean; user_id: string; error?: string }[];
      resync: { success: boolean; email: string; error?: string }[];
    } = {
      upgrades: [],
      resync: [],
    };

    // Handle upgrade records
    if (body.upgrades && Array.isArray(body.upgrades)) {
      for (const upgrade of body.upgrades) {
        try {
          // Insert into membership_upgrades
          const { error: insertError } = await supabaseAdmin
            .from("membership_upgrades")
            .insert({
              user_id: upgrade.user_id,
              from_level: upgrade.from_level,
              to_level: upgrade.to_level,
              amount: upgrade.amount,
              stripe_payment_id: upgrade.stripe_payment_id,
              created_at: upgrade.created_at || new Date().toISOString(),
            });

          if (insertError) {
            results.upgrades.push({
              success: false,
              user_id: upgrade.user_id,
              error: insertError.message,
            });
          } else {
            // Update profiles.membership_level to the new level
            const { error: updateError } = await supabaseAdmin
              .from("profiles")
              .update({
                membership_level: upgrade.to_level,
                previous_membership_level: upgrade.from_level,
                updated_at: new Date().toISOString(),
              })
              .eq("id", upgrade.user_id);

            if (updateError) {
              results.upgrades.push({
                success: false,
                user_id: upgrade.user_id,
                error: `Inserted upgrade but failed to update profile: ${updateError.message}`,
              });
            } else {
              results.upgrades.push({ success: true, user_id: upgrade.user_id });
            }
          }
        } catch (err) {
          results.upgrades.push({
            success: false,
            user_id: upgrade.user_id,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    // Handle resync (jessicahooie case)
    if (body.resync && Array.isArray(body.resync)) {
      for (const record of body.resync) {
        try {
          // Get stripe_customer_id from profiles
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", record.profile_id)
            .single();

          if (!profile?.stripe_customer_id) {
            results.resync.push({
              success: false,
              email: record.email,
              error: "No stripe_customer_id in profile",
            });
            continue;
          }

          // Sync payments from Stripe
          const paymentData = await syncCustomerPayments(profile.stripe_customer_id, record.profile_id);

          // Update stripe_backfill_status
          const { error: updateError } = await supabaseAdmin
            .from("stripe_backfill_status")
            .update({
              payment_count: paymentData.payment_count,
              total_amount: paymentData.total_amount,
              has_failed: paymentData.has_failed,
              has_refunded: paymentData.has_refunded,
              latest_payment_date: paymentData.latest_payment_date,
              latest_payment_status: paymentData.latest_payment_status,
              latest_payment_amount: paymentData.latest_payment_amount,
              latest_payment_error: paymentData.latest_payment_error,
              all_payments_json: paymentData.all_payments_json,
              payment_sync_at: new Date().toISOString(),
            })
            .eq("profile_id", record.profile_id);

          if (updateError) {
            results.resync.push({
              success: false,
              email: record.email,
              error: updateError.message,
            });
            continue;
          }

          // Insert into membership_payments
          const { inserted, skipped } = await insertMembershipPaymentsIfNeeded(
            record.profile_id,
            paymentData.all_payments_json
          );

          results.resync.push({
            success: true,
            email: record.email,
          });
          console.log(`[record-upgrades] Resynced ${record.email}: ${inserted} inserted, ${skipped} skipped`);
        } catch (err) {
          results.resync.push({
            success: false,
            email: record.email,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    const upgradesSuccess = results.upgrades.filter(r => r.success).length;
    const upgradesFailed = results.upgrades.filter(r => !r.success).length;
    const resyncSuccess = results.resync.filter(r => r.success).length;
    const resyncFailed = results.resync.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Upgrades: ${upgradesSuccess} inserted, ${upgradesFailed} failed | Resync: ${resyncSuccess} synced, ${resyncFailed} failed`,
      results,
    });

  } catch (error) {
    console.error("[record-upgrades] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record upgrades" },
      { status: 500 }
    );
  }
}
