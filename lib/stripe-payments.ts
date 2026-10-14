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

// ---------------------------------------------------------------------------
// Invoice → PaymentIntent / Charge resolution
// ---------------------------------------------------------------------------
//
// Since Stripe API 2025-03-31.basil, `Invoice.charge` and
// `Invoice.payment_intent` no longer exist. The payment lives under
// `Invoice.payments` (an InvoicePayment list), which is NOT included by
// default — list/retrieve calls must pass `expand: ["payments"]` (or
// `["data.payments"]` for list calls), otherwise fall back to
// `stripe.invoicePayments.list({ invoice })`.
//
// Refund/dispute matching in the webhook keys off `stripe_payment_intent_id`
// (every Charge carries `payment_intent`), so the PaymentIntent ID is the
// one that matters. The charge ID is a nice-to-have for `stripe_payment_id`.

export interface InvoicePaymentIds {
  paymentIntentId: string | null;
  chargeId: string | null;
}

const EMPTY_IDS: InvoicePaymentIds = { paymentIntentId: null, chargeId: null };

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function idsFromInvoicePayments(payments: Stripe.InvoicePayment[]): InvoicePaymentIds {
  const paid = payments.find((p) => p.status === "paid") ?? payments[0];
  if (!paid?.payment) return EMPTY_IDS;
  const pi = paid.payment.payment_intent;
  let chargeId = idOf(paid.payment.charge);
  // If the PaymentIntent was expanded we can read the charge for free.
  if (!chargeId && pi && typeof pi !== "string") {
    chargeId = idOf(pi.latest_charge);
  }
  return { paymentIntentId: idOf(pi), chargeId };
}

/**
 * Synchronous read from an invoice whose `payments` field was expanded.
 * Returns nulls when `payments` wasn't expanded — use
 * `resolveInvoicePaymentIds` when you can't guarantee the expansion.
 */
export function getInvoicePaymentIds(invoice: Stripe.Invoice): InvoicePaymentIds {
  const payments = invoice.payments?.data;
  if (!payments || payments.length === 0) return EMPTY_IDS;
  return idsFromInvoicePayments(payments);
}

/**
 * Full resolution: reads expanded `payments` if present, otherwise lists the
 * invoice's payments; then (optionally) retrieves the PaymentIntent to fill
 * in the charge ID. Never throws — returns whatever it could resolve.
 */
export async function resolveInvoicePaymentIds(
  stripe: Stripe,
  invoice: Pick<Stripe.Invoice, "id" | "payments">,
  options: { includeCharge?: boolean } = {},
): Promise<InvoicePaymentIds> {
  const includeCharge = options.includeCharge ?? true;
  let ids: InvoicePaymentIds = EMPTY_IDS;

  try {
    if (invoice.payments?.data?.length) {
      ids = idsFromInvoicePayments(invoice.payments.data);
    } else if (invoice.id) {
      const list = await stripe.invoicePayments.list({ invoice: invoice.id, limit: 10 });
      ids = idsFromInvoicePayments(list.data);
    }

    if (includeCharge && !ids.chargeId && ids.paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(ids.paymentIntentId);
      ids = { ...ids, chargeId: idOf(pi.latest_charge) };
    }
  } catch (err) {
    console.error(
      `[stripe-payments] Failed to resolve payment IDs for invoice ${invoice.id}:`,
      err instanceof Error ? err.message : err,
    );
  }

  return ids;
}
