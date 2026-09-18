import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type MembershipLevel = "free" | "contributing" | "founding" | "waitlist";
export type SubscriptionStatus = "active" | "canceling" | "cancelled" | null;

export interface TierResult {
  membership_level: MembershipLevel;
  subscription_status: SubscriptionStatus;
}

export interface RecalculateOptions {
  /**
   * Set true when called immediately after a payment reversal (refund or dispute).
   * When true, if `profile.previous_membership_level` is set, the tier restores to
   * that value and `previous_membership_level` is cleared on the profile. This
   * prevents a contributing→founding upgrade from leaving a member stuck at
   * founding after the upgrade is refunded, and prevents the chain of "previous"
   * tiers from going stale.
   */
  afterReversal?: boolean;
}

/**
 * Recalculates a member's tier based on their successful payment history.
 *
 * Logic:
 * - When `afterReversal` is true and `profile.previous_membership_level` is set,
 *   restore to that tier and clear the column. This is the design intent of
 *   `previous_membership_level`: capture the tier immediately before the upgrade
 *   so that a refund/dispute reversal can put the member back where they were.
 * - Otherwise, the most recent successful payment determines the tier:
 *   founding payment → founding
 *   contributing payment → contributing
 *   signup/renewal → free (or waitlist if they joined from waitlist)
 *   no successful payments → free
 */
export async function recalculateMembershipTier(
  userId: string,
  options: RecalculateOptions = {}
): Promise<TierResult & { restoredFromPrevious?: boolean }> {
  // Get the user's profile to check waitlist status + previous tier for restoration
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("waitlist_joined_at, membership_level, previous_membership_level")
    .eq("id", userId)
    .single();

  if (profileError) {
    console.error("[recalculateMembershipTier] Error fetching profile:", profileError);
    throw profileError;
  }

  // Get all successful payments, ordered by created_at DESC
  const { data: payments, error } = await supabaseAdmin
    .from("membership_payments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[recalculateMembershipTier] Error fetching payments:", error);
    throw error;
  }

  // Determine membership level based on most recent successful payment
  let membership_level: MembershipLevel = "free";
  let subscription_status: SubscriptionStatus = null;
  let restoredFromPrevious = false;

  if (options.afterReversal && profile?.previous_membership_level) {
    // Reverse path: restore the tier they had before the upgrade that was just
    // refunded. The previous_membership_level column is written on every upgrade
    // path (checkout.session.completed, customer.subscription.updated, gift code
    // redemption, waitlist approval). Clearing it on the next update prevents
    // the chain from going stale if a future refund happens before the next
    // upgrade.
    const restored = profile.previous_membership_level as MembershipLevel;
    if (restored === "free" || restored === "contributing" || restored === "founding" || restored === "waitlist") {
      membership_level = restored;
      restoredFromPrevious = true;

      // Subscription status mirrors the restored tier: paid tiers stay active,
      // free/waitlist have no subscription.
      if (membership_level === "contributing" || membership_level === "founding") {
        subscription_status = "active";
      } else {
        subscription_status = null;
      }

      console.log(
        `[recalculateMembershipTier] Restoring user ${userId} to previous_membership_level=${membership_level} after reversal`,
      );
    }
  } else if (payments && payments.length > 0) {
    const mostRecentPayment = payments[0];
    const paymentType = mostRecentPayment.payment_type;
    const amount = mostRecentPayment.amount;

    // Determine tier from payment type and amount
    if (paymentType === "upgrade" || amount === 100) {
      // $100 payment or upgrade → founding
      membership_level = "founding";
      subscription_status = "active";
    } else if (paymentType === "signup" || paymentType === "renewal" || amount === 15) {
      // $15 payment → contributing
      membership_level = "contributing";
      subscription_status = "active";
    } else {
      // Default to contributing for any other successful payment
      membership_level = "contributing";
      subscription_status = "active";
    }
  } else {
    // No successful payments
    membership_level = "free";
    subscription_status = null;

    // If they were on waitlist, put them back
    if (profile?.waitlist_joined_at) {
      membership_level = "waitlist";
    }
  }

  // If they're a free member, check if they were approved
  if (membership_level === "free") {
    // Free members don't have subscription status
    subscription_status = null;
  }

  return {
    membership_level,
    subscription_status,
    restoredFromPrevious,
  };
}

/**
 * Updates a member's profile with the recalculated tier.
 *
 * When `clearPreviousLevel` is true (used during refund-driven restorations),
 * the `previous_membership_level` column is set to NULL so the next upgrade
 * records a fresh "before" state.
 */
export async function updateMemberTier(
  userId: string,
  tierResult: TierResult,
  options: { clearPreviousLevel?: boolean } = {}
): Promise<void> {
  const updates: Record<string, unknown> = {
    membership_level: tierResult.membership_level,
    subscription_status: tierResult.subscription_status,
    updated_at: new Date().toISOString(),
  };

  if (options.clearPreviousLevel) {
    updates.previous_membership_level = null;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) {
    console.error("[updateMemberTier] Error updating profile:", error);
    throw error;
  }

  console.log(`[updateMemberTier] Updated user ${userId} to ${tierResult.membership_level}`);
}

/**
 * Full recalculate and update in one call.
 */
export async function recalculateAndUpdateMemberTier(
  userId: string,
  options: RecalculateOptions = {}
): Promise<TierResult & { restoredFromPrevious?: boolean }> {
  const tierResult = await recalculateMembershipTier(userId, options);
  // When we restored from a previous tier, clear the previous_membership_level
  // column so the next upgrade records the correct new "before" state.
  await updateMemberTier(
    userId,
    tierResult,
    { clearPreviousLevel: tierResult.restoredFromPrevious === true },
  );
  return tierResult;
}

/**
 * Finds a payment by stripe_payment_id, stripe_invoice_id, or stripe_payment_intent_id.
 */
export async function findPaymentByStripeId(
  stripeId: string
): Promise<{ id: string; user_id: string; amount: number; stripe_payment_id: string | null } | null> {
  // First try stripe_payment_id (charge ID)
  const { data: byPaymentId, error: byPaymentIdError } = await supabaseAdmin
    .from("membership_payments")
    .select("id, user_id, amount, stripe_payment_id")
    .eq("stripe_payment_id", stripeId)
    .limit(1)
    .single();

  if (byPaymentId && !byPaymentIdError) {
    return byPaymentId;
  }

  // Then try stripe_invoice_id
  const { data: byInvoiceId, error: byInvoiceIdError } = await supabaseAdmin
    .from("membership_payments")
    .select("id, user_id, amount, stripe_payment_id")
    .eq("stripe_invoice_id", stripeId)
    .limit(1)
    .single();

  if (byInvoiceId && !byInvoiceIdError) {
    return byInvoiceId;
  }

  // Finally try stripe_payment_intent_id (for refund events that come with charge ID)
  const { data: byIntentId, error: byIntentIdError } = await supabaseAdmin
    .from("membership_payments")
    .select("id, user_id, amount, stripe_payment_id")
    .eq("stripe_payment_intent_id", stripeId)
    .limit(1)
    .single();

  if (byIntentId && !byIntentIdError) {
    return byIntentId;
  }

  return null;
}

/**
 * Result of a refund/dispute processing.
 */
export interface RefundResult {
  success: boolean;
  reversalId: string | null;
  matchedPayment: { id: string; user_id: string; amount: number } | null;
  tierChanged: boolean;
  oldTier: string | null;
  newTier: string | null;
  userEmail: string | null;
}

/**
 * Records a payment reversal (refund or dispute).
 *
 * By default the tier is recalculated with `afterReversal: true`, which restores
 * the member to `profiles.previous_membership_level` (the tier they had before
 * the upgrade that was just reversed). Pass `recalculateTier: false` to skip
 * the tier update — used for partial refunds where the member should keep
 * their current tier.
 *
 * `actualRefundAmount` (in dollars) overrides the reversal row's amount. Pass
 * it for partial refunds so the negative-amount row reflects what was actually
 * returned, not the full original payment. Defaults to the original payment
 * amount when not provided (full refund).
 */
export async function recordPaymentReversal(
  originalPaymentId: string,
  reversalType: "refunded" | "disputed",
  reversalReason?: string,
  options: {
    actualRefundAmount?: number;
    recalculateTier?: boolean;
  } = {}
): Promise<RefundResult> {
  // Get the original payment
  const { data: originalPayment, error: fetchError } = await supabaseAdmin
    .from("membership_payments")
    .select("id, user_id, amount, payment_type, stripe_invoice_id, stripe_payment_id, stripe_payment_intent_id")
    .eq("id", originalPaymentId)
    .single();

  if (fetchError || !originalPayment) {
    console.error("[recordPaymentReversal] Original payment not found:", originalPaymentId);
    return {
      success: false,
      reversalId: null,
      matchedPayment: null,
      tierChanged: false,
      oldTier: null,
      newTier: null,
      userEmail: null,
    };
  }

  // Get old tier before recalculating
  const oldTier = originalPayment.payment_type === "upgrade" || originalPayment.amount === 100
    ? "founding"
    : originalPayment.payment_type === "signup" || originalPayment.payment_type === "renewal" || originalPayment.amount === 15
      ? "contributing"
      : "free";

  // Default to the full original payment amount; partial refunds pass an override
  const reversalAmount = -(options.actualRefundAmount ?? originalPayment.amount);

  // Insert reversal record
  const { data: reversalRecord, error: insertError } = await supabaseAdmin
    .from("membership_payments")
    .insert({
      user_id: originalPayment.user_id,
      amount: reversalAmount, // Negative; equals -original for full, -actualRefundAmount for partial
      payment_type: originalPayment.payment_type,
      status: reversalType,
      stripe_payment_id: originalPayment.stripe_payment_id,
      stripe_invoice_id: originalPayment.stripe_invoice_id,
      stripe_payment_intent_id: originalPayment.stripe_payment_intent_id,
      original_payment_id: originalPaymentId,
      reversal_reason: reversalReason || `${reversalType} event received`,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[recordPaymentReversal] Error inserting reversal:", insertError);
    return {
      success: false,
      reversalId: null,
      matchedPayment: originalPayment,
      tierChanged: false,
      oldTier,
      newTier: null,
      userEmail: null,
    };
  }

  console.log(
    `[recordPaymentReversal] Recorded ${reversalType} for payment ${originalPaymentId} (amount: ${reversalAmount})`,
  );

  // Get user email for notification
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", originalPayment.user_id)
    .single();

  // Recalculate and update the member's tier (skipped for partial refunds)
  let tierChanged = false;
  let newTier: string | null = null;
  const shouldRecalculate = options.recalculateTier !== false;
  if (shouldRecalculate) {
    try {
      const tierResult = await recalculateAndUpdateMemberTier(originalPayment.user_id, {
        afterReversal: true,
      });
      newTier = tierResult.membership_level;
      tierChanged = oldTier !== newTier;
    } catch (err) {
      console.error("[recordPaymentReversal] Error updating member tier:", err);
      // Don't fail the reversal if tier update fails
    }
  }

  return {
    success: true,
    reversalId: reversalRecord?.id || null,
    matchedPayment: originalPayment,
    tierChanged,
    oldTier,
    newTier,
    userEmail: profile?.email || null,
  };
}

/**
 * Sends a Slack notification for refund processing.
 */
export async function notifyRefundProcessed(params: {
  userId: string;
  email: string;
  amount: number;
  oldTier: string;
  newTier: string;
  refundType: "refunded" | "disputed";
  paymentId: string;
  tierChanged: boolean;
}): Promise<void> {
  const webhookUrl = process.env.SLACK_REFUND_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[notifyRefundProcessed] SLACK_REFUND_WEBHOOK_URL not configured, skipping notification");
    return;
  }

  const {
    email,
    amount,
    oldTier,
    newTier,
    refundType,
    paymentId,
    tierChanged,
  } = params;

  const emoji = tierChanged ? "🔵" : "⚪";
  const tierChangeText = tierChanged ? `• Tier Change: ${oldTier} → ${newTier}` : "";

  const message = {
    text: `${emoji} Refund Processed`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *Refund Processed*\n• Member: ${email}\n• Amount: $${Math.abs(amount).toFixed(2)}\n${tierChangeText}\n• Type: ${refundType}\n• Payment ID: ${paymentId}`,
        },
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error("[notifyRefundProcessed] Failed to send Slack notification:", response.statusText);
    }
  } catch (err) {
    console.error("[notifyRefundProcessed] Error sending Slack notification:", err);
  }
}

/**
 * Sends a Slack notification when a refund cannot be matched.
 */
export async function notifyRefundNotMatched(params: {
  chargeId: string;
  amount?: number;
  error: string;
}): Promise<void> {
  const webhookUrl = process.env.SLACK_REFUND_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[notifyRefundNotMatched] SLACK_REFUND_WEBHOOK_URL not configured, skipping notification");
    return;
  }

  const { chargeId, amount, error } = params;

  const message = {
    text: "🔴 Refund Not Matched - ACTION REQUIRED",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔴 *Refund Not Matched - ACTION REQUIRED*\n• Charge ID: ${chargeId}\n• Amount: ${amount ? `$${Math.abs(amount).toFixed(2)}` : "N/A"}\n• Error: ${error}\n• Please investigate manually`,
        },
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error("[notifyRefundNotMatched] Failed to send Slack notification:", response.statusText);
    }
  } catch (err) {
    console.error("[notifyRefundNotMatched] Error sending Slack notification:", err);
  }
}
