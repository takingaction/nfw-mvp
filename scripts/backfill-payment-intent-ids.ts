/**
 * Fills in stripe_payment_intent_id / stripe_payment_id on membership_payments
 * rows that were ingested from Stripe invoices without them.
 *
 * BACKGROUND:
 * Stripe API 2025-03-31.basil removed Invoice.charge and Invoice.payment_intent.
 * Every backfill route/cron read `(invoice as any).charge`, so subscription
 * signups/renewals were stored with null Stripe payment IDs. The refund and
 * dispute webhooks match on charge / PaymentIntent, so refunds on those rows
 * never matched. This script repairs existing rows; the ingest code is fixed
 * separately (lib/stripe-payments.ts → getInvoicePaymentIds).
 *
 * SAFETY:
 * - Dry-run by default. Pass --write to update.
 * - Only fills NULL columns. Never overwrites an existing value.
 * - Also fills the same IDs onto any reversal rows linked to the original.
 * - Bounded by --limit (rows per run, default 500). Re-run until 0 remain.
 * - ~2 Stripe calls per row, 150ms apart.
 * - CSV written to REPORTS-IGNORE/ (gitignored).
 *
 * USAGE:
 *   npx tsx scripts/backfill-payment-intent-ids.ts --limit=50          # preview
 *   npx tsx scripts/backfill-payment-intent-ids.ts --limit=500 --write
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { resolveInvoicePaymentIds } from "../lib/stripe-payments";

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

const WRITE = process.argv.includes("--write");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 500) : 500;
const offsetArg = process.argv.find((a) => a.startsWith("--offset="));
// Rows Stripe can't resolve (no_payment_found) stay NULL and re-appear at the
// front of the queue; use --offset to page past them if they pile up.
const OFFSET = offsetArg ? Math.max(0, Number(offsetArg.split("=")[1]) || 0) : 0;
const SLEEP_MS = 150;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const csv = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

interface Row {
  id: string;
  stripe_invoice_id: string;
  stripe_payment_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number;
  created_at: string;
}

async function main(): Promise<void> {
  // Rows that came from a Stripe invoice but lack the PaymentIntent.
  const { data, error } = await supabaseAdmin
    .from("membership_payments")
    .select("id, stripe_invoice_id, stripe_payment_id, stripe_payment_intent_id, amount, created_at")
    .is("original_payment_id", null)
    .not("stripe_invoice_id", "is", null)
    .is("stripe_payment_intent_id", null)
    .order("created_at", { ascending: true })
    .range(OFFSET, OFFSET + LIMIT - 1);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];

  const { count: remainingTotal } = await supabaseAdmin
    .from("membership_payments")
    .select("id", { count: "exact", head: true })
    .is("original_payment_id", null)
    .not("stripe_invoice_id", "is", null)
    .is("stripe_payment_intent_id", null);

  console.error(
    `[backfill-pi] ${WRITE ? "WRITE" : "DRY-RUN"} — processing ${rows.length} of ${remainingTotal ?? "?"} rows missing a PaymentIntent`,
  );

  const reportsDir = path.join(process.cwd(), "REPORTS-IGNORE");
  fs.mkdirSync(reportsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(reportsDir, `backfill-payment-intent-ids-${ts}.csv`);
  const out = fs.createWriteStream(outPath);
  out.write("payment_id,invoice_id,amount,created_at,payment_intent_id,charge_id,result\n");

  const tally: Record<string, number> = {};
  for (const row of rows) {
    const ids = await resolveInvoicePaymentIds(stripe, { id: row.stripe_invoice_id }, { includeCharge: true });
    await sleep(SLEEP_MS);

    let result: string;
    if (!ids.paymentIntentId && !ids.chargeId) {
      result = "no_payment_found"; // e.g. paid out-of-band / credit balance
    } else if (!WRITE) {
      result = "would_update";
    } else {
      const patch: Record<string, string> = {};
      if (ids.paymentIntentId) patch.stripe_payment_intent_id = ids.paymentIntentId;
      if (!row.stripe_payment_id && ids.chargeId) patch.stripe_payment_id = ids.chargeId;

      const { error: upErr } = await supabaseAdmin
        .from("membership_payments")
        .update(patch)
        .eq("id", row.id)
        .is("stripe_payment_intent_id", null);

      if (upErr) {
        result = `error: ${upErr.message}`;
      } else {
        // Keep linked reversal rows consistent (fill nulls only).
        if (ids.paymentIntentId) {
          await supabaseAdmin
            .from("membership_payments")
            .update({ stripe_payment_intent_id: ids.paymentIntentId })
            .eq("original_payment_id", row.id)
            .is("stripe_payment_intent_id", null);
        }
        if (ids.chargeId) {
          await supabaseAdmin
            .from("membership_payments")
            .update({ stripe_payment_id: ids.chargeId })
            .eq("original_payment_id", row.id)
            .is("stripe_payment_id", null);
        }
        result = "updated";
      }
    }

    tally[result.startsWith("error") ? "error" : result] = (tally[result.startsWith("error") ? "error" : result] ?? 0) + 1;
    out.write(
      [row.id, row.stripe_invoice_id, row.amount, row.created_at, ids.paymentIntentId, ids.chargeId, result]
        .map(csv)
        .join(",") + "\n",
    );
  }

  out.end();
  console.error(`[backfill-pi] Done:`, tally);
  console.error(`[backfill-pi] CSV: ${outPath}`);
  if (!WRITE) console.error(`[backfill-pi] Dry run — re-run with --write to apply.`);
}

main().catch((err) => {
  console.error("[backfill-pi] Fatal:", err);
  process.exit(1);
});
