import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendGiftCodesEmail, sendWelcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

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
  console.log("[webhook] Received request");
  console.log("[webhook] URL:", request.url);
  console.log("[webhook] Headers:", JSON.stringify(Object.fromEntries(request.headers.entries())));
  
  const body = await request.text();
  console.log("[webhook] Body length:", body.length);
  
  const signature = request.headers.get("stripe-signature")!;
  console.log("[webhook] Signature header present:", !!signature);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
    console.log("[webhook] Signature verified, event type:", event.type);
  } catch (err: any) {
    console.error("[webhook] Signature verification failed:", err.message);
    console.error("[webhook] This means the webhook secret may be wrong or the payload was modified");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const isGiftPurchase = session.metadata?.giftPurchase === "true";

        if (isGiftPurchase) {
          const buyerName = session.metadata?.buyerName || "Friend";
          const buyerEmail = session.metadata?.buyerEmail;
          const quantity = parseInt(session.metadata?.quantity || "1", 10);

          if (buyerEmail && quantity > 0) {
            // Create purchase record
            const { data: purchase, error: purchaseError } = await supabaseAdmin
              .from("gift_membership_purchases")
              .insert({
                buyer_name: buyerName,
                buyer_email: buyerEmail,
                quantity,
                stripe_session_id: session.id,
                stripe_payment_intent_id: session.payment_intent as string,
                total_amount: session.amount_total || (quantity * 1500),
              })
              .select()
              .single();

            if (purchaseError) {
              console.error("Failed to create purchase record:", purchaseError);
              break;
            }

            // Generate codes
            const codes: string[] = [];
            for (let i = 0; i < quantity; i++) {
              const code = Math.random().toString(36).substring(2, 10).toUpperCase();
              codes.push(code);

              await supabaseAdmin.from("gift_membership_codes").insert({
                purchase_id: purchase.id,
                code,
              });
            }

            // Send email with codes
            await sendGiftCodesEmail({
              to: buyerEmail,
              buyerName,
              codes,
            });

            console.log(`Gift purchase processed: ${quantity} codes for ${buyerEmail}`);
          }
        } else {
          // Regular membership purchase
          const userId = session.metadata?.userId;
          const membershipLevel = session.metadata?.membershipLevel;

          console.log("[webhook] checkout.session.completed received");
          console.log("[webhook] userId from metadata:", userId);
          console.log("[webhook] membershipLevel from metadata:", membershipLevel);
          console.log("[webhook] full metadata:", JSON.stringify(session.metadata));

          if (userId && membershipLevel) {
            console.log("[webhook] Updating profile for user:", userId, "to level:", membershipLevel);

            // Check if profile exists
            const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
              .from("profiles")
              .select("id, membership_level")
              .eq("id", userId)
              .single();

            console.log("[webhook] Profile check result:", { existingProfile, profileCheckError });

            if (profileCheckError || !existingProfile) {
              console.error("[webhook] Profile not found for userId:", userId);
            } else {
              console.log("[webhook] Current membership_level:", existingProfile.membership_level);

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
                console.error("[webhook] Failed to update membership:", error);
              } else {
                console.log("[webhook] Profile updated successfully to:", membershipLevel);
              }
            }
          } else {
            console.log("[webhook] Skipping update - userId or membershipLevel is missing");
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