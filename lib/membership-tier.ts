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

/**
 * Recalculates a member's tier based on their successful payment history.
 * 
 * Logic:
 * - Most recent successful payment determines tier
 * - founding payment → founding
 * - contributing payment → contributing  
 * - signup/renewal → free (or waitlist if they joined from waitlist)
 * - no successful payments → free
 */
export async function recalculateMembershipTier(
  userId: string
): Promise<TierResult> {
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

  // Get the user's profile to check waitlist status
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("waitlist_joined_at, membership_level")
    .eq("id", userId)
    .single();

  if (profileError) {
    console.error("[recalculateMembershipTier] Error fetching profile:", profileError);
    throw profileError;
  }

  // Determine membership level based on most recent successful payment
  let membership_level: MembershipLevel = "free";
  let subscription_status: SubscriptionStatus = null;

  if (payments && payments.length > 0) {
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
  };
}

/**
 * Updates a member's profile with the recalculated tier.
 */
export async function updateMemberTier(
  userId: string,
  tierResult: TierResult
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      membership_level: tierResult.membership_level,
      subscription_status: tierResult.subscription_status,
      updated_at: new Date().toISOString(),
    })
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
  userId: string
): Promise<TierResult> {
  const tierResult = await recalculateMembershipTier(userId);
  await updateMemberTier(userId, tierResult);
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
 */
export async function recordPaymentReversal(
  originalPaymentId: string,
  reversalType: "refunded" | "disputed",
  reversalReason?: string
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

  // Insert reversal record
  const { data: reversalRecord, error: insertError } = await supabaseAdmin
    .from("membership_payments")
    .insert({
      user_id: originalPayment.user_id,
      amount: -originalPayment.amount, // Negative amount for reversals
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

  console.log(`[recordPaymentReversal] Recorded ${reversalType} for payment ${originalPaymentId}`);

  // Get user email for notification
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", originalPayment.user_id)
    .single();

  // Recalculate and update the member's tier
  let tierChanged = false;
  let newTier: string | null = null;
  try {
    const tierResult = await recalculateAndUpdateMemberTier(originalPayment.user_id);
    newTier = tierResult.membership_level;
    tierChanged = oldTier !== newTier;
  } catch (err) {
    console.error("[recordPaymentReversal] Error updating member tier:", err);
    // Don't fail the reversal if tier update fails
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
