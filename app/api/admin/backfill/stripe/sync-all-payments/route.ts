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

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  date: string;
  error_message: string | null;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncPaymentsForCustomer(
  stripeCustomerId: string,
  profileId: string | null
): Promise<{
  payment_count: number;
  total_amount: number;
  has_failed: boolean;
  has_refunded: boolean;
  latest_payment_date: string | null;
  latest_payment_status: string | null;
  latest_payment_amount: number | null;
  latest_payment_error: string | null;
  all_payments_json: PaymentRecord[];
} | null> {
  try {
    // Fetch all charges for this customer
    const charges: Stripe.Charge[] = [];
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

      const response = await stripe.charges.list(params);
      charges.push(...response.data);

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }

      // Rate limit
      await sleep(25);
    }

    // Process all charges
    const allPayments: PaymentRecord[] = [];
    let totalAmount = 0;
    let hasFailed = false;
    let hasRefunded = false;
    let latestSucceededPayment: { date: string; amount: number; status: string } | null = null;

    for (const charge of charges) {
      const amount = charge.amount / 100;
      const status = charge.status;
      const date = new Date(charge.created * 1000).toISOString();

      let errorMessage: string | null = null;
      if (status === "failed" && charge.failure_message) {
        errorMessage = charge.failure_message;
        hasFailed = true;
      }

      if (status === "succeeded" && charge.refunds?.data && charge.refunds.data.length > 0) {
        hasRefunded = true;
      }

      if (status === "succeeded") {
        totalAmount += amount;
        if (!latestSucceededPayment || new Date(date) > new Date(latestSucceededPayment.date)) {
          latestSucceededPayment = { date, amount, status };
        }
      }

      allPayments.push({
        id: charge.id,
        amount,
        status,
        date,
        error_message: errorMessage,
      });
    }

    // Sort by date descending
    allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      payment_count: allPayments.length,
      total_amount: totalAmount,
      has_failed: hasFailed,
      has_refunded: hasRefunded,
      latest_payment_date: latestSucceededPayment?.date || null,
      latest_payment_status: latestSucceededPayment?.status || null,
      latest_payment_amount: latestSucceededPayment?.amount || null,
      latest_payment_error: null,
      all_payments_json: allPayments,
    };
  } catch (error: any) {
    console.error(`[sync-payments] Error for customer ${stripeCustomerId}:`, error.message);
    return null;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
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

    // Get all matched rows with stripe_customer_id - with pagination
    const rows: { id: string; stripe_customer_id: string; profile_id: string | null; email: string }[] = [];
    let sapPage = 0;
    const sapPageSize = 1000;
    let sapHasMore = true;

    while (sapHasMore) {
      const { data: batch, error: rowsError } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select("id, stripe_customer_id, profile_id, email")
        .eq("status", "matched")
        .not("stripe_customer_id", "is", null)
        .range(sapPage * sapPageSize, (sapPage + 1) * sapPageSize - 1);

      if (rowsError) {
        console.error("[sync-payments] Error fetching rows:", rowsError);
        return NextResponse.json({ error: rowsError.message }, { status: 500 });
      }

      if (batch && batch.length > 0) {
        rows.push(...batch);
        sapPage++;
        sapHasMore = batch.length === sapPageSize;
      } else {
        sapHasMore = false;
      }
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        failed: 0,
        errors: [],
        message: "No matched rows with stripe_customer_id found",
      });
    }

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    // Process in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      // Process batch concurrently
      const batchResults = await Promise.all(
        batch.map(async (row) => {
          if (!row.stripe_customer_id) {
            return { id: row.id, success: false, error: "No stripe_customer_id" };
          }

          const paymentData = await syncPaymentsForCustomer(
            row.stripe_customer_id,
            row.profile_id
          );

          if (!paymentData) {
            return { id: row.id, success: false, error: "Stripe API error" };
          }

          // Update the row in stripe_backfill_status
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
              customer_processed_at: new Date().toISOString(),
            })
            .eq("id", row.id);

          if (updateError) {
            console.error(`[sync-payments] Update error for ${row.id}:`, updateError);
            return { id: row.id, success: false, error: updateError.message };
          }

          return { id: row.id, success: true };
        })
      );

      // Count results
      for (const r of batchResults) {
        if (r.success) {
          result.synced++;
        } else {
          result.failed++;
          if (r.error) {
            result.errors.push(`${r.id}: ${r.error}`);
          }
        }
      }

      // Progress logging
      console.log(`[sync-payments] Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);

      // Delay between batches
      if (i + BATCH_SIZE < rows.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log(`[sync-payments] Complete: ${result.synced} synced, ${result.failed} failed`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("[sync-payments] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync payments" },
      { status: 500 }
    );
  }
}
