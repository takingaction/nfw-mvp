import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PRICE_TO_MEMBERSHIP: Record<string, string> = {
  [process.env.STRIPE_PRICE_CONTRIBUTING!]: "contributing",
  [process.env.STRIPE_PRICE_FOUNDING!]: "founding",
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const membershipLevel = session.metadata?.membershipLevel;

        if (userId && membershipLevel) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              membership_level: membershipLevel,
              subscription_status: "active",
              subscription_ends_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          if (error) {
            console.error("Failed to update membership:", error);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;

        const customer = (await stripe.customers.retrieve(
          customerId,
        )) as Stripe.Customer;

        if (!customer.email) {
          break;
        }

        if (subscription.cancel_at_period_end) {
          const endsAt = new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000);

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "canceling",
              subscription_ends_at: endsAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("email", customer.email);
        } else {
          const newMembershipLevel = PRICE_TO_MEMBERSHIP[priceId];

          if (newMembershipLevel) {
            await supabaseAdmin
              .from("profiles")
              .update({
                membership_level: newMembershipLevel,
                subscription_status: "active",
                subscription_ends_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq("email", customer.email);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const customer = (await stripe.customers.retrieve(
          customerId,
        )) as Stripe.Customer;

        if (customer.email) {
          await supabaseAdmin
            .from("profiles")
            .update({
              membership_level: "free",
              subscription_status: "cancelled",
              subscription_ends_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("email", customer.email);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}