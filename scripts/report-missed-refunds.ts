/**
 * REPORT ONLY — finds Stripe refunds and lost disputes that never produced a
 * reversal row in membership_payments.
 *
 * BACKGROUND:
 * Until the basil fix, subscription payments were stored without a charge ID
 * and the refund/dispute webhook only matched on charge ID, so those events
 * fell through to the "refund not matched" Slack alert and no reversal was
 * recorded. This script measures the damage. It makes NO writes.
 *
 * MATCHING (per refunded/disputed charge), in order:
 *   1. membership_payments.stripe_payment_id        = charge ID
 *   2. membership_payments.stripe_payment_intent_id = PaymentIntent ID
 *   3. PaymentIntent → Stripe invoice payment → stripe_invoice_id
 *      (works even before scripts/backfill-payment-intent-ids.ts has run)
 * Charges matching nothing are listed as `unmatched` — usually gift, shop or
 * donation charges that aren't membership payments at all.
 *
 * OUTPUT: CSV in REPORTS-IGNORE/ + summary on stderr.
 *
 * USAGE:
 *   npx tsx scripts/report-missed-refunds.ts                 # since 2026-01-01
 *   npx tsx scripts/report-missed-refunds.ts --since=2025-06-01
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const sinceArg = process.argv.find((a) => a.startsWith("--since="));
const SINCE = sinceArg ? sinceArg.split("=")[1] : "2026-01-01";
const SINCE_TS = Math.floor(new Date(`${SINCE}T00:00:00Z`).getTime() / 1000);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const idOf = (v: string | { id: string } | null | undefined) => (!v ? null : typeof v === "string" ? v : v.id);
const csv = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const dollars = (n: number) => Math.round(n * 100) / 100;

interface Event {
  kind: "refund" | "dispute_lost";
  chargeId: string;
  paymentIntentId: string | null;
  amount: number; // dollars; cumulative refunded for refunds, disputed for disputes
  chargeAmount: number | null;
  date: string;
  detail: string;
}

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  payment_type: string;
  stripe_invoice_id: string | null;
  created_at: string;
}

const PAYMENT_COLS = "id, user_id, amount, payment_type, stripe_invoice_id, created_at";

async function findOriginal(ev: Event): Promise<{ payment: Payment | null; method: string }> {
  const tryCol = async (col: string, val: string | null) => {
    if (!val) return null;
    const { data } = await supabaseAdmin
      .from("membership_payments")
      .select(PAYMENT_COLS)
      .eq(col, val)
      .is("original_payment_id", null)
      .limit(1)
      .maybeSingle();
    return (data as Payment | null) ?? null;
  };

  let p = await tryCol("stripe_payment_id", ev.chargeId);
  if (p) return { payment: p, method: "charge_id" };
  p = await tryCol("stripe_payment_intent_id", ev.paymentIntentId);
  if (p) return { payment: p, method: "payment_intent_id" };

  if (ev.paymentIntentId) {
    try {
      const ip = await stripe.invoicePayments.list({
        payment: { type: "payment_intent", payment_intent: ev.paymentIntentId },
        limit: 1,
      });
      await sleep(100);
      const invoiceId = idOf(ip.data[0]?.invoice as string | { id: string } | undefined);
      p = await tryCol("stripe_invoice_id", invoiceId);
      if (p) return { payment: p, method: "invoice_via_pi" };
    } catch (err) {
      console.error(`[report] invoicePayments lookup failed for ${ev.paymentIntentId}:`, (err as Error).message);
    }
  }
  return { payment: null, method: "none" };
}

async function main(): Promise<void> {
  console.error(`[report] Loading Stripe refunds and disputes since ${SINCE}…`);

  // ---- Refunds, grouped per charge (amount_refunded semantics = cumulative)
  const byCharge = new Map<string, Event>();
  for await (const r of stripe.refunds.list({ created: { gte: SINCE_TS }, limit: 100, expand: ["data.charge"] })) {
    if (r.status !== "succeeded") continue;
    const charge = typeof r.charge === "object" ? r.charge : null;
    const chargeId = idOf(r.charge);
    if (!chargeId) continue;
    const existing = byCharge.get(chargeId);
    const date = new Date(r.created * 1000).toISOString();
    if (existing) {
      existing.amount = dollars(existing.amount + r.amount / 100);
      if (date > existing.date) existing.date = date;
    } else {
      byCharge.set(chargeId, {
        kind: "refund",
        chargeId,
        paymentIntentId: idOf(r.payment_intent) ?? idOf(charge?.payment_intent),
        amount: r.amount / 100,
        chargeAmount: charge ? charge.amount / 100 : null,
        date,
        detail: charge?.description ?? "",
      });
    }
  }

  const events: Event[] = [...byCharge.values()];

  // ---- Lost disputes
  for await (const d of stripe.disputes.list({ created: { gte: SINCE_TS }, limit: 100 })) {
    if (d.status !== "lost") continue;
    const chargeId = idOf(d.charge);
    if (!chargeId) continue;
    events.push({
      kind: "dispute_lost",
      chargeId,
      paymentIntentId: idOf(d.payment_intent),
      amount: d.amount / 100,
      chargeAmount: null,
      date: new Date(d.created * 1000).toISOString(),
      detail: d.reason ?? "",
    });
  }

  console.error(`[report] ${byCharge.size} refunded charges, ${events.length - byCharge.size} lost disputes. Matching…`);

  const reportsDir = path.join(process.cwd(), "REPORTS-IGNORE");
  fs.mkdirSync(reportsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(reportsDir, `missed-refunds-${ts}.csv`);
  const out = fs.createWriteStream(outPath);
  out.write(
    "result,kind,event_date,charge_id,payment_intent_id,stripe_amount,charge_amount,match_method," +
      "payment_id,user_email,payment_type,payment_amount,payment_date,already_reversed,missing_amount,full_reversal,detail\n",
  );

  const summary: Record<string, { count: number; amount: number }> = {};
  const bump = (k: string, amt: number) => {
    summary[k] ??= { count: 0, amount: 0 };
    summary[k].count++;
    summary[k].amount = dollars(summary[k].amount + amt);
  };

  for (const ev of events) {
    const { payment, method } = await findOriginal(ev);

    let result: string;
    let alreadyReversed = 0;
    let missing = 0;
    let email = "";
    let full = false;

    if (!payment) {
      result = "unmatched";
    } else {
      const status = ev.kind === "refund" ? "refunded" : "disputed";
      const { data: revs } = await supabaseAdmin
        .from("membership_payments")
        .select("amount")
        .eq("original_payment_id", payment.id)
        .eq("status", status);
      alreadyReversed = dollars((revs ?? []).reduce((s, r) => s + Math.abs(Number(r.amount) || 0), 0));
      missing = dollars(Math.min(ev.amount, Number(payment.amount)) - alreadyReversed);
      full = ev.amount >= Number(payment.amount);
      result = missing > 0 ? "MISSING_REVERSAL" : missing < 0 ? "over_reversed" : "ok";

      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", payment.user_id)
        .maybeSingle();
      email = prof?.email ?? "";
    }

    bump(`${result} (${ev.kind})`, result === "MISSING_REVERSAL" ? missing : ev.amount);
    out.write(
      [
        result, ev.kind, ev.date, ev.chargeId, ev.paymentIntentId, ev.amount, ev.chargeAmount, method,
        payment?.id, email, payment?.payment_type, payment?.amount, payment?.created_at,
        alreadyReversed, missing, full, ev.detail,
      ].map(csv).join(",") + "\n",
    );
  }

  out.end();
  console.error(`\n[report] Summary (amount = missing $ for MISSING_REVERSAL, else Stripe $):`);
  console.table(summary);
  console.error(`[report] CSV: ${outPath}`);
  console.error(
    `[report] MISSING_REVERSAL rows with full_reversal=true are members whose tier would have been recalculated.`,
  );
}

main().catch((err) => {
  console.error("[report] Fatal:", err);
  process.exit(1);
});
