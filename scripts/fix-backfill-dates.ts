/**
 * Repairs created_at / payment_type on membership_payments rows inserted by the
 * Oct 6–7 runs of scripts/backfill-missing-payments.ts, which (a) never set
 * created_at, so rows got the insert time, and (b) derived payment_type from
 * "does this member have any other row" instead of Stripe's billing_reason.
 *
 * For every original (non-reversal) row stored in the date window with a
 * stripe_invoice_id, retrieves the invoice from Stripe and compares.
 *
 * SAFETY:
 * - Dry-run by default; --write to apply.
 * - Only touches rows whose stored date is >24h off the invoice date, or whose
 *   type disagrees with billing_reason. Leaves `upgrade` rows alone unless
 *   Stripe also says subscription_update (webhook upgrades are authoritative).
 * - Reversal rows linked to a fixed row are left as-is (their date is the
 *   refund/dispute date, which is correct).
 * - CSV in REPORTS-IGNORE/.
 *
 * USAGE:
 *   npx tsx scripts/fix-backfill-dates.ts                       # preview Oct 6–8 (UTC)
 *   npx tsx scripts/fix-backfill-dates.ts --write
 *   npx tsx scripts/fix-backfill-dates.ts --from=2026-10-06 --to=2026-10-09
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { mapBillingReasonToPaymentType } from "../lib/stripe-payments";

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

const arg = (flag: string, fallback: string) =>
  process.argv.find((a) => a.startsWith(`${flag}=`))?.split("=")[1] ?? fallback;
const WRITE = process.argv.includes("--write");
const FROM = arg("--from", "2026-10-06");
const TO = arg("--to", "2026-10-09");
const DAY_MS = 24 * 60 * 60 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const csv = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

interface Row {
  id: string;
  stripe_invoice_id: string;
  created_at: string;
  payment_type: string;
  amount: number;
}

async function main(): Promise<void> {
  const rows: Row[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabaseAdmin
      .from("membership_payments")
      .select("id, stripe_invoice_id, created_at, payment_type, amount")
      .is("original_payment_id", null)
      .not("stripe_invoice_id", "is", null)
      .gte("created_at", FROM)
      .lt("created_at", TO)
      .order("created_at")
      .range(page * 1000, page * 1000 + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }

  console.error(`[fix-dates] ${WRITE ? "WRITE" : "DRY-RUN"} — checking ${rows.length} rows stored ${FROM} → ${TO}`);

  const reportsDir = path.join(process.cwd(), "REPORTS-IGNORE");
  fs.mkdirSync(reportsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(reportsDir, `fix-backfill-dates-${ts}.csv`);
  const out = fs.createWriteStream(outPath);
  out.write("payment_id,invoice_id,amount,stored_date,invoice_date,stored_type,billing_reason,correct_type,result\n");

  const tally: Record<string, number> = {};
  for (const row of rows) {
    let invoice: Stripe.Invoice;
    try {
      invoice = await stripe.invoices.retrieve(row.stripe_invoice_id);
    } catch (err) {
      tally.stripe_error = (tally.stripe_error ?? 0) + 1;
      out.write([row.id, row.stripe_invoice_id, row.amount, row.created_at, "", row.payment_type, "", "", `stripe_error: ${(err as Error).message}`].map(csv).join(",") + "\n");
      continue;
    }
    await sleep(100);

    const invoiceDate = new Date(invoice.created * 1000).toISOString();
    const correctType = mapBillingReasonToPaymentType(invoice.billing_reason);
    const dateWrong = Math.abs(new Date(row.created_at).getTime() - invoice.created * 1000) > DAY_MS;
    // Don't downgrade a webhook-recorded upgrade unless Stripe agrees it's not one.
    const typeWrong = row.payment_type !== correctType && !(row.payment_type === "upgrade" && invoice.billing_reason === "subscription_update");

    let result: string;
    if (!dateWrong && !typeWrong) {
      result = "ok";
    } else {
      const label = [dateWrong && "date", typeWrong && "type"].filter(Boolean).join("+");
      if (!WRITE) {
        result = `would_fix_${label}`;
      } else {
        const patch: { created_at?: string; payment_type?: string } = {};
        if (dateWrong) patch.created_at = invoiceDate;
        if (typeWrong) patch.payment_type = correctType;
        const { error } = await supabaseAdmin.from("membership_payments").update(patch).eq("id", row.id);
        result = error ? `error: ${error.message}` : `fixed_${label}`;
      }
    }

    const key = result.startsWith("error") ? "error" : result;
    tally[key] = (tally[key] ?? 0) + 1;
    out.write(
      [row.id, row.stripe_invoice_id, row.amount, row.created_at, invoiceDate, row.payment_type, invoice.billing_reason, correctType, result]
        .map(csv)
        .join(",") + "\n",
    );
  }

  out.end();
  console.error(`[fix-dates] Done:`, tally);
  console.error(`[fix-dates] CSV: ${outPath}`);
  if (!WRITE) console.error(`[fix-dates] Dry run — re-run with --write to apply.`);
}

main().catch((err) => {
  console.error("[fix-dates] Fatal:", err);
  process.exit(1);
});
