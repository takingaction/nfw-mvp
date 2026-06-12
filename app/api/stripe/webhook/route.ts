import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendBankAccountConnectedAdminEmail } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("[Stripe Webhook] No signature provided");
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type} at ${new Date().toISOString()}`);

    // Handle account.updated events - fires when Connect account onboarding completes
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      console.log(`[Stripe Webhook] Account updated: ${account.id}, details_submitted: ${account.details_submitted}, charges_enabled: ${account.charges_enabled}`);

      if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
        // Find the grant(s) associated with this Stripe account
        const { data: grants, error: grantError } = await supabaseAdmin
          .from("grants")
          .select("id, user_id, status, grant_cycles(cycle_name)")
          .eq("stripe_connect_account_id", account.id)
          .eq("status", "approved"); // Only update if currently approved

        if (grantError) {
          console.error("[Stripe Webhook] Error finding grants:", grantError);
        } else if (grants && grants.length > 0) {
          for (const grant of grants) {
            // Update status to payment_pending
            await supabaseAdmin
              .from("grants")
              .update({ status: "payment_pending" })
              .eq("id", grant.id);

            console.log(`[Stripe Webhook] Updated grant ${grant.id} to payment_pending`);

            // Send admin notification email
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("full_name")
              .eq("id", grant.user_id)
              .single();

            const { data: user } = await supabaseAdmin
              .from("auth.users")
              .select("email")
              .eq("id", grant.user_id)
              .single();

            const cycleName = (grant.grant_cycles as any)?.cycle_name || "Grant";

            sendBankAccountConnectedAdminEmail({
              memberName: profile?.full_name || "Unknown",
              memberEmail: user?.email || "Unknown",
              grantCycleName: cycleName,
              grantId: grant.id,
            });
          }
        } else {
          console.log(`[Stripe Webhook] No approved grants found for account ${account.id}`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Stripe Webhook] Error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed", details: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ received: true });
}