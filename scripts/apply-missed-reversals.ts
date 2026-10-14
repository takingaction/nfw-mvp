/**
 * Records the refund reversals the webhook missed (see
 * scripts/report-missed-refunds.ts, run 2026-10-13). One-off.
 *
 * Each entry inserts a negative "refunded" row linked to the original payment
 * via recordPaymentReversal (tier recalculation OFF), backdates it to the
 * actual Stripe refund date so revenue lands in the right month, and then
 * applies the explicit tier decision for that member, if any.
 *
 * SAFETY:
 * - Dry-run by default; --write to apply.
 * - Idempotent: skips any payment that already has >= the refund amount
 *   recorded as refunded.
 * - Refuses --write while any tier decision is still "PENDING".
 *
 * USAGE:
 *   npx tsx scripts/apply-missed-reversals.ts
 *   npx tsx scripts/apply-missed-reversals.ts --write
 */

import * as fs from "fs";
import * as path from "path";

function loadEnv(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

type TierDecision = null | "PENDING" | "free" | "contributing" | "founding";

interface PlanEntry {
  paymentId: string;
  who: string;
  refund: number; // dollars refunded in Stripe
  refundedAt: string; // Stripe refund date (UTC)
  reason: string;
  /** null = leave tier alone; otherwise set membership_level explicitly. */
  tier: TierDecision;
}

const PLAN: PlanEntry[] = [
  // ---- Real members
  {
    paymentId: "5fab63ee-7b05-4170-aee0-42d142c9fc51",
    who: "wanderingwellspring@gmail.com",
    refund: 15,
    refundedAt: "2026-09-23T12:00:00Z",
    reason: "Refund of duplicate subscription (member has a second, active subscription). Recorded retroactively.",
    tier: null,
  },
  {
    paymentId: "a36df982-2a84-4a97-91c2-a8c255f5f9fb",
    who: "angelikariggs@gmail.com",
    refund: 100,
    refundedAt: "2026-09-18T18:00:00Z",
    reason: "Refunded at member's request: wanted $15 membership, not $100 (K. Driscoll). Founding subscription cancelled. Recorded retroactively.",
    tier: "free",
  },
  {
    paymentId: "26b1fb76-211d-4a8c-a885-c7e7eea29d3a",
    who: "rosehandelman@gmail.com",
    refund: 15,
    refundedAt: "2026-08-14T12:00:00Z",
    reason: "Refund of duplicate subscription (member has a second, active subscription). Recorded retroactively.",
    tier: null,
  },
  // ---- Test accounts — reversals only, tiers untouched
  {
    paymentId: "6bba01f6-f3b0-412e-b4bc-8dd57831792f",
    who: "kdrisco2@gmail.com (test)",
    refund: 10,
    refundedAt: "2026-09-18T12:00:00Z",
    reason: "Partial refund on test account. Recorded retroactively.",
    tier: null,
  },
  {
    paymentId: "ffbf4781-6051-41d2-8979-7f96ff579e84",
    who: "kdrisco2@gmail.com (test)",
    refund: 85,
    refundedAt: "2026-09-18T12:00:00Z",
    reason: "Refund on test account. Recorded retroactively.",
    tier: null,
  },
  {
    paymentId: "8f3a7af4-f186-4ebf-9421-87aa4202e23a",
    who: "ronpassaro@gmail.com (test)",
    refund: 15,
    refundedAt: "2026-04-27T12:00:00Z",
    reason: "Refund on test account. Recorded retroactively.",
    tier: null,
  },
  {
    paymentId: "ea22a3d2-735f-4234-b567-5099511d2dab",
    who: "ronpassaro@gmail.com (test)",
    refund: 15,
    refundedAt: "2026-04-27T12:00:00Z",
    reason: "Refund on test account. Recorded retroactively.",
    tier: null,
  },
];

const WRITE = process.argv.includes("--write");

async function main(): Promise<void> {
  // Import after env is loaded — lib/membership-tier creates its client at import time.
  const { createClient } = await import("@supabase/supabase-js");
  const { recordPaymentReversal, getReversedTotal } = await import("../lib/membership-tier");
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const pending = PLAN.filter((p) => p.tier === "PENDING");
  if (WRITE && pending.length > 0) {
    console.error(`[apply-reversals] Refusing --write: tier decision PENDING for ${pending.map((p) => p.who).join(", ")}`);
    process.exit(1);
  }

  console.error(`[apply-reversals] ${WRITE ? "WRITE" : "DRY-RUN"} — ${PLAN.length} entries\n`);

  for (const entry of PLAN) {
    const { data: payment, error } = await supabaseAdmin
      .from("membership_payments")
      .select("id, user_id, amount, payment_type, original_payment_id")
      .eq("id", entry.paymentId)
      .maybeSingle();

    const { data: profile } = payment
      ? await supabaseAdmin
          .from("profiles")
          .select("email, membership_level, subscription_status, previous_membership_level")
          .eq("id", payment.user_id)
          .maybeSingle()
      : { data: null };

    const head = `${entry.who.padEnd(32)} $${String(entry.refund).padStart(3)}`;
    if (error || !payment || payment.original_payment_id) {
      console.error(`${head}  ERROR: payment ${entry.paymentId} not found or is itself a reversal`);
      continue;
    }

    const already = await getReversedTotal(payment.id, "refunded");
    const toRecord = Math.round((entry.refund - already) * 100) / 100;
    const tierNote =
      entry.tier === null
        ? `tier stays ${profile?.membership_level}`
        : entry.tier === "PENDING"
          ? `tier PENDING (now ${profile?.membership_level}, previous_membership_level=${profile?.previous_membership_level ?? "null"})`
          : `tier ${profile?.membership_level} → ${entry.tier}`;

    if (toRecord <= 0) {
      console.error(`${head}  skip — $${already} already recorded`);
      continue;
    }
    if (!WRITE) {
      console.error(`${head}  would record -$${toRecord} dated ${entry.refundedAt.slice(0, 10)}; ${tierNote}`);
      continue;
    }

    const result = await recordPaymentReversal(payment.id, "refunded", entry.reason, {
      actualRefundAmount: toRecord,
      recalculateTier: false,
    });
    if (!result.success || !result.reversalId) {
      console.error(`${head}  FAILED to record reversal (see log above)`);
      continue;
    }

    await supabaseAdmin
      .from("membership_payments")
      .update({ created_at: entry.refundedAt })
      .eq("id", result.reversalId);

    if (entry.tier && entry.tier !== "PENDING") {
      const { error: tierErr } = await supabaseAdmin
        .from("profiles")
        .update({
          membership_level: entry.tier,
          subscription_status: entry.tier === "free" ? null : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.user_id);
      if (tierErr) console.error(`${head}  reversal recorded, tier update FAILED: ${tierErr.message}`);
    }

    console.error(`${head}  recorded -$${toRecord} (reversal ${result.reversalId}); ${tierNote}`);
  }
}

main().catch((err) => {
  console.error("[apply-reversals] Fatal:", err);
  process.exit(1);
});
