import type Stripe from "stripe";

/**
 * Since Stripe API 2025-03-31.basil, `current_period_end` lives on subscription
 * items, not on the Subscription itself. Reading it off the subscription returns
 * undefined (and `new Date(undefined * 1000).toISOString()` throws).
 */
export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const ends = subscription.items?.data
    ?.map((item) => item.current_period_end)
    .filter((v): v is number => typeof v === "number");
  if (!ends || ends.length === 0) return null;
  return new Date(Math.max(...ends) * 1000);
}

/**
 * Returns when a subscription is scheduled to stop, or null if it will renew.
 * Covers both "cancel at period end" and a specific `cancel_at` date (the
 * Dashboard and Customer Portal can set either).
 */
export function getScheduledCancelDate(subscription: Stripe.Subscription): Date | null {
  if (subscription.status === "canceled") return null;
  if (subscription.cancel_at) return new Date(subscription.cancel_at * 1000);
  if (subscription.cancel_at_period_end) return getSubscriptionPeriodEnd(subscription);
  return null;
}

/** Subscription statuses that can still produce a charge. */
export const BILLABLE_SUBSCRIPTION_STATUSES: Stripe.Subscription.Status[] = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
];
