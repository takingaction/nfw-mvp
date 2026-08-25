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
        console.log("[webhook] Processing checkout.session.completed event");
        const session = event.data.object as Stripe.Checkout.Session;
        const isGiftPurchase = session.metadata?.giftPurchase === "true";

        // Store stripe_customer_id and signup_source for membership purchases
        // Always set stripe_customer_id if we have it from checkout (not just if NULL)
        if (!isGiftPurchase && session.customer && session.metadata?.userId) {
          const userId = session.metadata.userId;
          const stripeCustomerId = session.customer as string;
          
          // Get current profile to check existing values
          const { data: currentProfile } = await supabaseAdmin
            .from("profiles")
            .select("stripe_customer_id, signup_source")
            .eq("id", userId)
            .single();
          
          const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          };
          
          // Always set stripe_customer_id if we have it from checkout
          if (session.customer) {
            updates.stripe_customer_id = stripeCustomerId;
          }
          if (!currentProfile?.signup_source || currentProfile.signup_source === 'unknown') {
            updates.signup_source = 'stripe';
          }
          
          if (Object.keys(updates).length > 1) { // More than just updated_at
            await supabaseAdmin
              .from("profiles")
              .update(updates)
              .eq("id", userId);
            console.log("[webhook] Stored stripe_customer_id and signup_source for user:", userId);
          }
        }

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
          let userId = session.metadata?.userId;
          let membershipLevel = session.metadata?.membershipLevel;
          const customerEmail = session.customer_details?.email;
          const paymentIntentId = session.payment_intent as string;
          const amountPaid = (session.amount_total || 0) / 100;

          console.log("[webhook] checkout.session.completed received");
          console.log("[webhook] userId from metadata:", userId);
          console.log("[webhook] membershipLevel from metadata:", membershipLevel);
          console.log("[webhook] full metadata:", JSON.stringify(session.metadata));

          // If userId is missing from metadata, try email fallback
          if (!userId && customerEmail) {
            console.log("[webhook] userId missing from metadata, trying email fallback:", customerEmail);
            const { data: profileByEmail } = await supabaseAdmin
              .from("profiles")
              .select("id, membership_level")
              .eq("email", customerEmail)
              .single();
            
            if (profileByEmail) {
              userId = profileByEmail.id;
              membershipLevel = membershipLevel || profileByEmail.membership_level;
              console.log("[webhook] Found user by email:", userId);
            }
          }

          // Mark abandoned checkout as recovered if exists
          if (userId && session.id) {
            const { data: abandoned } = await supabaseAdmin
              .from("abandoned_checkouts")
              .select("id")
              .eq("stripe_session_id", session.id)
              .eq("user_id", userId)
              .is("recovered_at", null)
              .single();

            if (abandoned) {
              await supabaseAdmin
                .from("abandoned_checkouts")
                .update({ recovered_at: new Date().toISOString() })
                .eq("id", abandoned.id);
              console.log("[webhook] Marked abandoned checkout as recovered:", abandoned.id);
            } else if (userId && membershipLevel) {
              // Fallback: match by user_id + membershipLevel if session ID lookup found nothing
              // This handles cases where user had an abandoned checkout but completed with a different session ID
              const { data: abandonedByUser } = await supabaseAdmin
                .from("abandoned_checkouts")
                .select("id")
                .eq("user_id", userId)
                .eq("membership_level", membershipLevel)
                .is("recovered_at", null)
                .single();

              if (abandonedByUser) {
                await supabaseAdmin
                  .from("abandoned_checkouts")
                  .update({ recovered_at: new Date().toISOString() })
                  .eq("id", abandonedByUser.id);
                console.log("[webhook] Marked abandoned checkout as recovered (user+level fallback):", abandonedByUser.id);
              }
            }
          }

          if (userId && membershipLevel) {
            console.log("[webhook] Updating profile for user:", userId, "to level:", membershipLevel);

            // Check if profile exists
            const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
              .from("profiles")
              .select("id, full_name, membership_level, first_paid_at, first_paid_level")
              .eq("id", userId)
              .single();

            console.log("[webhook] Profile check result:", { existingProfile, profileCheckError });

            let profileUpdated = false;
            let profileId = userId;
            let profileName = "";

            if (profileCheckError || !existingProfile) {
              console.error("[webhook] Profile not found by ID, trying email lookup via auth.users");
              // Fallback: find user by email in auth.users, then update their profile
              if (customerEmail) {
                console.log("[webhook] Looking up auth user by email:", customerEmail);
                // List users to find by email - need to use admin API
                const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
                const authUser = usersList?.users?.find(u => u.email === customerEmail);

                if (authUser) {
                  console.log("[webhook] Found auth user:", authUser.id);
                  // Get profile by auth user id
                  const { data: authProfile } = await supabaseAdmin
                    .from("profiles")
                    .select("full_name")
                    .eq("id", authUser.id)
                    .single();

                  profileName = authProfile?.full_name || "";
                  profileId = authUser.id;

                  // Update profile using the auth user's ID
                  // Only update subscription if payment was actually successful
                  if (session.payment_status === 'paid') {
                    const { error: updateError } = await supabaseAdmin
                      .from("profiles")
                      .update({
                        membership_level: membershipLevel,
                        previous_membership_level: 'free', // Edge case: assume free if unknown
                        subscription_status: "active",
                        subscription_ends_at: null,
                        updated_at: new Date().toISOString(),
                        // Track first paid upgrade (only if not already set)
                        first_paid_at: new Date().toISOString(),
                        first_paid_level: membershipLevel,
                      })
                      .eq("id", authUser.id);

                    if (updateError) {
                      console.error("[webhook] Failed to update membership via email lookup:", updateError);
                    } else {
                      console.log("[webhook] Profile updated successfully via email lookup to:", membershipLevel);
                      profileUpdated = true;

                      // Insert membership_payment record (backup for invoice.paid, handles missing stripe_customer_id)
                      if (authUser.id && amountPaid > 0 && paymentIntentId) {
                        const { data: existingPayment } = await supabaseAdmin
                          .from("membership_payments")
                          .select("id")
                          .eq("stripe_payment_id", paymentIntentId)
                          .maybeSingle();

                        if (!existingPayment) {
                          const { error: paymentError } = await supabaseAdmin
                            .from("membership_payments")
                            .insert({
                              user_id: authUser.id,
                              amount: amountPaid,
                              payment_type: "signup",
                              stripe_payment_id: paymentIntentId,
                            });

                          if (paymentError) {
                            console.error("[webhook] Failed to insert membership_payment via email lookup:", paymentError);
                          } else {
                            console.log("[webhook] Inserted membership_payment via email lookup:", amountPaid);
                          }
                        }
                      }
                    }
                  } else {
                    console.log("[webhook] Payment not completed (payment_status:", session.payment_status, "), skipping profile update via email lookup");
                  }
                } else {
                  console.error("[webhook] Auth user not found by email:", customerEmail);
                }
              } else {
                console.error("[webhook] No email in session.customer_details to fallback to");
              }
            } else {
              console.log("[webhook] Current membership_level:", existingProfile.membership_level);
              profileName = existingProfile.full_name || "";

              // Only set subscription to active if payment was actually successful
              if (session.payment_status === 'paid') {
                const { error } = await supabaseAdmin
                  .from("profiles")
                  .update({
                    membership_level: membershipLevel,
                    previous_membership_level: existingProfile.membership_level,
                    subscription_status: "active",
                    subscription_ends_at: null,
                    updated_at: new Date().toISOString(),
                    // Track first paid upgrade (only if not already set)
                    first_paid_at: existingProfile.first_paid_at || new Date().toISOString(),
                    first_paid_level: existingProfile.first_paid_level || membershipLevel,
                  })
                  .eq("id", userId);

                if (error) {
                  console.error("[webhook] Failed to update membership:", error);
                } else {
                  console.log("[webhook] Profile updated successfully to:", membershipLevel);
                  profileUpdated = true;

                  // Insert membership_payment record (backup for invoice.paid, handles missing stripe_customer_id)
                  if (userId && amountPaid > 0 && paymentIntentId) {
                    const { data: existingPayment } = await supabaseAdmin
                      .from("membership_payments")
                      .select("id")
                      .eq("stripe_payment_id", paymentIntentId)
                      .maybeSingle();

                    if (!existingPayment) {
                      // Determine payment type
                      let paymentType: "signup" | "upgrade" = "signup";
                      if (existingProfile.membership_level && existingProfile.membership_level !== "free") {
                        paymentType = "upgrade";
                      }

                      const { error: paymentError } = await supabaseAdmin
                        .from("membership_payments")
                        .insert({
                          user_id: userId,
                          amount: amountPaid,
                          payment_type: paymentType,
                          stripe_payment_id: paymentIntentId,
                        });

                      if (paymentError) {
                        console.error("[webhook] Failed to insert membership_payment:", paymentError);
                      } else {
                        console.log("[webhook] Inserted membership_payment:", paymentType, "amount:", amountPaid);
                      }
                    }
                  }
                }
              } else {
                console.log("[webhook] Payment not completed (payment_status:", session.payment_status, "), skipping profile update");
              }
            }

            // Send welcome email if profile was updated
            if (profileUpdated && customerEmail) {
              const renewalDate = new Date();
              renewalDate.setFullYear(renewalDate.getFullYear() + 1);

              await sendWelcomeEmail({
                to: customerEmail,
                name: profileName || "there",
                membershipType: membershipLevel as "contributing" | "founding",
                memberId: profileId,
                renewalDate: renewalDate.toISOString(),
              }).catch((err) => {
                console.error("[webhook] Failed to send welcome email:", err);
              });

              // Sync to Access Perks (idempotent - only syncs if access_perks_member_id is null)
              try {
                const { checkAndSyncAccessMember } = await import("@/lib/access-perks/member-sync");
                await checkAndSyncAccessMember(supabaseAdmin, profileId, customerEmail);
              } catch (err) {
                console.error("[webhook] Failed to sync to Access Perks:", err);
              }
            }
          } else {
            console.log("[webhook] Skipping update - userId or membershipLevel is missing");
          }
        }
        console.log("[webhook] checkout.session.completed handler complete");
        break;
      }

      case "checkout.session.expired": {
        console.log("[webhook] Processing checkout.session.expired event");
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const membershipLevel = session.metadata?.membershipLevel;
        const isGiftPurchase = session.metadata?.giftPurchase === "true";

        // Skip gift purchases - they have their own flow
        if (isGiftPurchase) {
          console.log("[webhook] Skipping expired gift checkout");
          break;
        }

        // Only track regular membership purchases
        if (userId && membershipLevel) {
          // Check if user's current membership_level matches what was in the session
          // If they've already switched to "free" (e.g., via contact form), skip recording
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("membership_level")
            .eq("id", userId)
            .single();

          if (profile && profile.membership_level !== membershipLevel) {
            console.log("[webhook] Skipping abandoned checkout - user has already switched to:", profile.membership_level);
            break;
          }

          // Check if already recorded (e.g., if completed before we processed expired)
          const { data: existing } = await supabaseAdmin
            .from("abandoned_checkouts")
            .select("id")
            .eq("stripe_session_id", session.id)
            .single();

          if (existing) {
            console.log("[webhook] Abandoned checkout already recorded:", existing.id);
            break;
          }

          // Insert abandoned checkout record
          const { data: abandoned, error: abandonedError } = await supabaseAdmin
            .from("abandoned_checkouts")
            .insert({
              user_id: userId,
              membership_level: membershipLevel,
              stripe_session_id: session.id,
              stripe_customer_id: session.customer as string || null,
              checkout_url: session.url || null,
              email_retry_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
            })
            .select("id")
            .single();

          if (abandonedError) {
            console.error("[webhook] Failed to record abandoned checkout:", abandonedError);
          } else {
            console.log("[webhook] Recorded abandoned checkout:", abandoned.id, "for user:", userId);
          }
        } else {
          console.log("[webhook] Skipping expired checkout - missing userId or membershipLevel in metadata");
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;

        console.log("[webhook] Processing customer.subscription.updated for customer:", customerId);

        const customer = (await stripe.customers.retrieve(
          customerId,
        )) as Stripe.Customer;

        if (!customer.email) {
          break;
        }

        // Look up user by email in auth.users
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = usersList?.users?.find(u => u.email === customer.email);

        if (!authUser) {
          console.error("[webhook] customer.subscription.updated: Auth user not found by email:", customer.email);
          break;
        }

        // Fetch current profile to get existing membership_level
        const { data: currentProfile } = await supabaseAdmin
          .from("profiles")
          .select("membership_level, first_paid_at, first_paid_level, lifetime_value")
          .eq("id", authUser.id)
          .single();

        if (subscription.cancel_at_period_end) {
          const endsAt = new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000);

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "canceling",
              subscription_ends_at: endsAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", authUser.id);
        } else {
          const newMembershipLevel = PRICE_TO_MEMBERSHIP[priceId];

          if (newMembershipLevel && currentProfile) {
            const previousLevel = currentProfile.membership_level;
            const isUpgrade = (
              (previousLevel === "contributing" && newMembershipLevel === "founding") ||
              (previousLevel === "free" && (newMembershipLevel === "contributing" || newMembershipLevel === "founding"))
            );

            // Get the amount for the upgrade (85 for contributing->founding, 100 for free->founding)
            let upgradeAmount = 0;
            if (newMembershipLevel === "founding") {
              upgradeAmount = 85; // Default upgrade amount
              if (previousLevel === "free") {
                upgradeAmount = 100; // Free to founding is full price
              }
            }

            // If this is an upgrade, insert into membership_upgrades AND membership_payments
            if (isUpgrade && upgradeAmount > 0) {
              // Get the latest invoice to find the actual payment amount
              let stripePaymentId = null;
              let actualAmount = upgradeAmount;
              let stripeInvoiceId = null;
              try {
                const invoices = await stripe.invoices.list({
                  customer: customerId,
                  limit: 1,
                });
                if (invoices.data.length > 0) {
                  const invoice = invoices.data[0];
                  if (typeof invoice === 'object' && 'payment_intent' in invoice) {
                    stripePaymentId = (invoice as any).payment_intent as string || null;
                    stripeInvoiceId = invoice.id;
                    // Use actual invoice amount if available
                    if (invoice.amount_paid > 0) {
                      actualAmount = invoice.amount_paid / 100;
                    }
                  }
                }
              } catch (err) {
                console.error("[webhook] customer.subscription.updated: Failed to get invoice:", err);
              }

              // Insert into membership_upgrades
              await supabaseAdmin
                .from("membership_upgrades")
                .insert({
                  user_id: authUser.id,
                  from_level: previousLevel || "free",
                  to_level: newMembershipLevel,
                  amount: actualAmount,
                  stripe_payment_id: stripePaymentId,
                });

              // Insert into membership_payments for the upgrade amount
              await supabaseAdmin
                .from("membership_payments")
                .insert({
                  user_id: authUser.id,
                  amount: actualAmount,
                  payment_type: "upgrade",
                  stripe_payment_id: stripePaymentId,
                  stripe_invoice_id: stripeInvoiceId,
                });

              // Update lifetime_value on profile
              try {
                await supabaseAdmin.rpc("increment_lifetime_value", {
                  user_id: authUser.id,
                  increment_amount: actualAmount,
                });
              } catch (rpcErr) {
                console.error("[webhook] customer.subscription.updated: Failed to update lifetime_value:", rpcErr);
                // Fallback: direct update if RPC fails
                await supabaseAdmin
                  .from("profiles")
                  .update({
                    lifetime_value: (currentProfile?.lifetime_value || 0) + actualAmount,
                  })
                  .eq("id", authUser.id);
              }

              console.log("[webhook] customer.subscription.updated: Recorded upgrade from", previousLevel, "to", newMembershipLevel, "amount:", actualAmount);
            }

            await supabaseAdmin
              .from("profiles")
              .update({
                membership_level: newMembershipLevel,
                previous_membership_level: previousLevel,
                subscription_status: "active",
                subscription_ends_at: null,
                updated_at: new Date().toISOString(),
                // Track first paid upgrade (only if not already set)
                first_paid_at: currentProfile.first_paid_at || new Date().toISOString(),
                first_paid_level: currentProfile.first_paid_level || newMembershipLevel,
              })
              .eq("id", authUser.id);
          }
        }
        console.log("[webhook] customer.subscription.updated completed for:", customer.email);
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;

        console.log("[webhook] Processing customer.subscription.created for customer:", customerId);

        const customer = (await stripe.customers.retrieve(
          customerId,
        )) as Stripe.Customer;

        if (!customer.email) {
          break;
        }

        // Look up user by email in auth.users
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = usersList?.users?.find(u => u.email === customer.email);

        if (!authUser) {
          console.error("[webhook] customer.subscription.created: Auth user not found by email:", customer.email);
          break;
        }

        // Fetch current profile to get existing values
        const { data: currentProfile } = await supabaseAdmin
          .from("profiles")
          .select("membership_level, first_paid_at, first_paid_level, stripe_customer_id, signup_source")
          .eq("id", authUser.id)
          .single();

        const newMembershipLevel = PRICE_TO_MEMBERSHIP[priceId];

        // Build updates object
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (newMembershipLevel) {
          updates.membership_level = newMembershipLevel;
          updates.previous_membership_level = currentProfile?.membership_level || 'free';
          updates.subscription_status = "active";
          updates.subscription_ends_at = null;
          // Track first paid upgrade (only if not already set)
          updates.first_paid_at = currentProfile?.first_paid_at || new Date().toISOString();
          updates.first_paid_level = currentProfile?.first_paid_level || newMembershipLevel;
        }

        // Store stripe_customer_id if not already set
        if (!currentProfile?.stripe_customer_id) {
          updates.stripe_customer_id = customerId;
        }

        // Set signup_source if not already set
        if (!currentProfile?.signup_source || currentProfile.signup_source === 'unknown') {
          updates.signup_source = 'stripe';
        }

        if (Object.keys(updates).length > 1) { // More than just updated_at
          await supabaseAdmin
            .from("profiles")
            .update(updates)
            .eq("id", authUser.id);

          console.log("[webhook] customer.subscription.created: Profile updated to:", newMembershipLevel);
        }

        console.log("[webhook] customer.subscription.created completed for:", customer.email);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const amountPaid = invoice.amount_paid / 100; // Convert from cents

        console.log("[webhook] Processing invoice.paid for customer:", customerId, "amount:", amountPaid);

        // Skip if this is a draft or uncollectible invoice
        if (invoice.status === "draft" || invoice.status === "uncollectible") {
          console.log("[webhook] Skipping invoice.paid - draft or uncollectible:", invoice.status);
          break;
        }

        // Skip zero amount invoices
        if (amountPaid <= 0) {
          console.log("[webhook] Skipping invoice.paid - zero or negative amount:", amountPaid);
          break;
        }

        const stripeInvoiceId = invoice.id;
        const stripePaymentId = (invoice as any).payment_intent as string || null;

        // Check if this invoice/payment was already recorded (avoid duplicate from subscription.updated)
        const { data: existingPayment } = await supabaseAdmin
          .from("membership_payments")
          .select("id")
          .eq("stripe_invoice_id", stripeInvoiceId)
          .maybeSingle();

        if (existingPayment) {
          console.log("[webhook] Skipping invoice.paid - already recorded:", stripeInvoiceId);
          break;
        }

        // Look up profile by stripe_customer_id
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, membership_level, previous_membership_level")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!profile) {
          console.log("[webhook] invoice.paid: No profile found for stripe_customer_id:", customerId);
          break;
        }

        const userId = profile.id;
        const invoiceCreatedAt = new Date(invoice.created * 1000).toISOString();

        // Determine payment type
        let paymentType: "signup" | "renewal" | "upgrade" | "refund" = "renewal";

        // Check if this is a refund (credit note)
        const billingReason = (invoice as any).billing_reason as string | null;
        if (billingReason === "credit_note") {
          paymentType = "refund";
        }

        // Check if this is a proration/upgrade (subscription_update with proration)
        const subscriptionProration = (invoice as any).subscription_proration as boolean | null;
        if (subscriptionProration === true || billingReason === "subscription_update") {
          paymentType = "upgrade";
        }

        // Determine if this is a signup based on previous_membership_level
        if (!profile.previous_membership_level) {
          paymentType = "signup";
        }

        // Insert into membership_payments
        const { data: paymentRecord, error: paymentError } = await supabaseAdmin
          .from("membership_payments")
          .insert({
            user_id: userId,
            amount: amountPaid,
            payment_type: paymentType,
            stripe_payment_id: stripePaymentId,
            stripe_invoice_id: stripeInvoiceId,
            created_at: invoiceCreatedAt,
          })
          .select("id")
          .single();

        if (paymentError) {
          console.error("[webhook] invoice.paid: Failed to insert payment record:", paymentError);
        } else {
          console.log("[webhook] invoice.paid: Inserted payment record:", paymentRecord.id, "type:", paymentType);

          // Update lifetime_value on profile for successful payments (not refunds)
          if (paymentType !== "refund" && amountPaid > 0) {
            try {
              await supabaseAdmin.rpc("increment_lifetime_value", {
                user_id: userId,
                increment_amount: amountPaid,
              });
              console.log("[webhook] invoice.paid: Updated lifetime_value for user:", userId, "amount:", amountPaid);
            } catch (rpcError) {
              console.error("[webhook] invoice.paid: Failed to update lifetime_value via RPC:", rpcError);
            }
          }
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log("[webhook] Processing customer.subscription.deleted for customer:", customerId);

        const customer = (await stripe.customers.retrieve(
          customerId,
        )) as Stripe.Customer;

        if (customer.email) {
          console.log("[webhook] Subscription deleted for:", customer.email, "- downgrading to free");

          // Look up user by email in auth.users, then update their profile
          const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
          const authUser = usersList?.users?.find(u => u.email === customer.email);

          if (authUser) {
            console.log("[webhook] Found auth user:", authUser.id, "- updating profile to free");

            await supabaseAdmin
              .from("profiles")
              .update({
                membership_level: "free",
                subscription_status: "cancelled",
                subscription_ends_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", authUser.id);

            console.log("[webhook] Profile downgraded to free for:", customer.email);
          } else {
            console.error("[webhook] Auth user not found by email:", customer.email);
          }
        } else {
          console.error("[webhook] customer.subscription.deleted: No email found for customer", customerId);
        }
        break;
      }

      case "account.updated": {
        // Auto-transfer is disabled. Transfers are now initiated manually via admin UI.
        // See /admin/grants/[id]/scoring/combined for the manual transfer workflow.
        const account = event.data.object as Stripe.Account;
        console.log("[webhook] account.updated event received for:", account.id);
        console.log("[webhook] details_submitted:", account.details_submitted, "charges_enabled:", account.charges_enabled, "payouts_enabled:", account.payouts_enabled);
        break;
      }

      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        console.log("[webhook] Transfer created:", transfer.id, "to:", transfer.destination, "amount:", transfer.amount);
        // Backup confirmation - transfer was initiated by Stripe
        // Status is already payment_sent from the approval/update-status flow
        break;
      }

      case "transfer.reversed": {
        const transfer = event.data.object as Stripe.Transfer;
        console.log("[webhook] Transfer reversed:", transfer.id, "amount:", transfer.amount);

        // Find grant by transfer metadata and revert status
        const grantId = transfer.metadata?.grantId;
        if (grantId) {
          await supabaseAdmin
            .from("grants")
            .update({ status: "payment_pending" })
            .eq("id", grantId);

          console.log("[webhook] Reverted grant", grantId, "to payment_pending due to transfer reversal");

          // Notify admin of reversal
          const { data: grant } = await supabaseAdmin
            .from("grants")
            .select("user_id, grant_cycles(cycle_name)")
            .eq("id", grantId)
            .single();

          if (grant) {
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("full_name")
              .eq("id", grant.user_id)
              .single();

            const { data: authUser } = await supabaseAdmin
              .from("auth.users")
              .select("email")
              .eq("id", grant.user_id)
              .single();

            // Send reversal notification to admin
            const { sendTransferReversedAdminEmail } = await import("@/lib/email");
            sendTransferReversedAdminEmail({
              memberName: profile?.full_name || "Unknown",
              memberEmail: authUser?.email || "Unknown",
              grantCycleName: (grant.grant_cycles as any)?.cycle_name || "Grant",
              grantId: grantId,
              amount: (transfer.amount / 100).toFixed(2),
            }).catch(err => console.error("[webhook] Failed to send reversal email:", err));
          }
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
