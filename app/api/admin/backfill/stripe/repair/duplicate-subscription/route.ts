import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import { findOtherLiveSubscriptions, PAID_LEVELS } from "@/lib/membership-end";
import { resolveInvoicePaymentIds } from "@/lib/stripe-payments";

/**
 * POST { subscriptionId, refund: boolean }
 *
 * Cancels a member's EXTRA active subscription now (no proration), and with
 * refund=true also refunds that subscription's latest paid invoice.
 *
 * Refuses unless the member still has another live subscription afterwards,
 * so this can never end anyone's membership. The resulting webhooks are safe:
 * customer.subscription.deleted keeps the member (other live subscription),
 * and charge.refunded leaves the tier alone while a subscription is live.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const subscriptionId = typeof body?.subscriptionId === "string" ? body.subscriptionId : null;
  const refund = body?.refund === true;
  if (!subscriptionId || !subscriptionId.startsWith("sub_")) {
    return NextResponse.json({ error: "subscriptionId is required" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });
  const supabase = getAdminClient();

  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["customer"] });
  } catch {
    return NextResponse.json({ error: "Subscription not found in Stripe" }, { status: 404 });
  }
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return NextResponse.json({ error: `Subscription is ${subscription.status}, not active` }, { status: 409 });
  }

  const customer = subscription.customer as Stripe.Customer | Stripe.DeletedCustomer;
  const customerId = customer.id;
  const email = !("deleted" in customer && customer.deleted) ? (customer as Stripe.Customer).email : null;

  // The member this subscription belongs to: saved customer id, then email.
  let { data: profile } = await supabase
    .from("profiles")
    .select("id, email, membership_level, stripe_customer_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!profile && email) {
    // Exact email lookup (ilike would treat "_" and "%" in emails as wildcards).
    const { data: rows } = await supabase.rpc("find_user_by_email", { target_email: email });
    const userId = rows && rows.length > 0 ? (rows[0].id as string) : null;
    if (userId) {
      ({ data: profile } = await supabase
        .from("profiles")
        .select("id, email, membership_level, stripe_customer_id")
        .eq("id", userId)
        .maybeSingle());
    }
  }
  if (!profile || !(PAID_LEVELS as readonly string[]).includes(profile.membership_level ?? "")) {
    return NextResponse.json({ error: "No paid member found for this subscription" }, { status: 409 });
  }

  // Safety: the member must keep at least one other live subscription.
  const others = await findOtherLiveSubscriptions(stripe, {
    customerIds: [customerId, profile.stripe_customer_id],
    email: email ?? profile.email,
    excludeSubscriptionId: subscription.id,
  });
  if (others.length === 0) {
    return NextResponse.json(
      { error: "This is the member's only live subscription. Cancel it from Stripe if that's intended." },
      { status: 409 },
    );
  }

  // Find the charge to refund before cancelling, so a lookup failure stops the
  // whole action instead of leaving it half done.
  let refundTarget: { chargeId: string | null; paymentIntentId: string | null; amount: number; invoiceId: string } | null = null;
  if (refund) {
    const invoices = await stripe.invoices.list({ subscription: subscription.id, status: "paid", limit: 1 });
    const invoice = invoices.data[0];
    if (!invoice || invoice.amount_paid <= 0) {
      return NextResponse.json({ error: "No paid invoice found on this subscription to refund" }, { status: 409 });
    }
    const ids = await resolveInvoicePaymentIds(stripe, invoice);
    if (!ids.chargeId && !ids.paymentIntentId) {
      return NextResponse.json({ error: "Couldn't find the payment for this subscription's invoice" }, { status: 409 });
    }
    refundTarget = { ...ids, amount: invoice.amount_paid, invoiceId: invoice.id! };
  }

  await stripe.subscriptions.cancel(subscription.id, { prorate: false, invoice_now: false });

  let refunded: number | null = null;
  if (refundTarget) {
    try {
      const r = await stripe.refunds.create(
        refundTarget.chargeId ? { charge: refundTarget.chargeId } : { payment_intent: refundTarget.paymentIntentId! },
        { idempotencyKey: `duplicate-sub-refund-${refundTarget.invoiceId}` },
      );
      refunded = r.amount / 100;
    } catch (err) {
      console.error("[repair/duplicate-subscription] refund failed after cancel:", err);
      return NextResponse.json(
        {
          error: `Subscription cancelled, but the refund failed: ${err instanceof Error ? err.message : "unknown error"}. Refund invoice ${refundTarget.invoiceId} from Stripe.`,
          cancelled: true,
          refunded: null,
        },
        { status: 502 },
      );
    }
  }

  console.log(
    `[repair/duplicate-subscription] ${admin.user?.email ?? admin.user?.id} cancelled ${subscription.id} for ${profile.id}` +
      (refunded !== null ? `, refunded $${refunded}` : "") +
      `; kept ${others.map((s) => s.id).join(", ")}`,
  );
  return NextResponse.json({ ok: true, cancelled: true, refunded, kept: others.map((s) => s.id) });
}
