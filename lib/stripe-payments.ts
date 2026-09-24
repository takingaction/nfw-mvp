import type Stripe from "stripe";

/**
 * Stripe → local `payment_type` mapping used by every backfill route and
 * cron that ingests invoices into `membership_payments`.
 *
 * Three cases we currently handle:
 *   subscription_create → signup    (first paid invoice on a new sub)
 *   subscription_cycle  → renewal  (subsequent scheduled invoices)
 *   subscription_update → upgrade  (changed plan / quantity / etc.)
 *
 * Stripe also emits `subscription_cycle` for *adjustment* invoices that
 * net to $0 (period reconciliations, payment-method retries, etc.). Those
 * are not real revenue events — see `shouldRecordPayment` below.
 */
export function mapBillingReasonToPaymentType(
  billingReason: string | null,
): "signup" | "renewal" | "upgrade" {
  switch (billingReason) {
    case "subscription_create":
      return "signup";
    case "subscription_cycle":
      return "renewal";
    case "subscription_update":
      return "upgrade";
    default:
      return "renewal";
  }
}

/**
 * True when an invoice represents an actual charge worth recording as a
 * `membership_payments` row.
 *
 * - Must be `status === "paid"` (invoice finalized, no further retries).
 * - Must have `amount_paid > 0` (1 cent or more). $0 paid invoices are
 *   Stripe-side adjustment events: a real `subscription_cycle` adjustment
 *   with no net revenue. Recording them as renewals pollutes the analytics
 *   "Verified Revenue" sum and the renewal-count badges. See AGENTS.md
 *   entry for 2026-09-30 ("no such thing as a $0 renewal").
 */
export function shouldRecordPayment(invoice: Pick<Stripe.Invoice, "amount_paid" | "status">): boolean {
  return invoice.status === "paid" && (invoice.amount_paid ?? 0) >= 1;
}
