/**
 * Backfills missing membership_payments rows for Stripe invoices the broken
 * webhook handler silently dropped.
 *
 * BACKGROUND:
 * Stripe webhook handlers were calling supabase.auth.admin.listUsers() and
 * filtering the result by email to look up an auth user id. listUsers()
 * defaults to 50 users per page with no filter-by-email param, so past ~50
 * users the lookup silently returned undefined and these handlers did nothing:
 *
 *   - checkout.session.completed  (fallback when userId missing)
 *   - customer.subscription.updated
 *   - customer.subscription.created
 *   - customer.subscription.deleted
 *
 * For paying members in that gap, membership_payments rows were never inserted.
 *
 * This script does a one-shot reconciliation: it paginates through Stripe
 * invoices since N days ago, filters to the two membership amounts ($15/$100),
 * and inserts any missing rows into membership_payments.
 *
 * SAFETY (read this before running with --write):
 * - Default mode is dry-run. No writes until --write is passed.
 * - Idempotent: uses INSERT ... ON CONFLICT (stripe_invoice_id) DO NOTHING
 *   (UNIQUE constraint from migration 059 ensures dedupe).
 * - Bounded: --limit caps inserts per run, --days caps the Stripe lookback,
 *   --max-runtime caps wall-clock, --max-stripe-calls caps API budget.
 * - Filters: only paid invoices with amount exactly 1500 ($15) or 10000 ($100)
 *   cents. All others skipped with a logged reason.
 * - Rate-limited: 250ms between Stripe API calls (4/sec, well below limit).
 * - Output: stdout = CSV, REPORTS-IGNORE/backfill-{ts}.csv = same CSV,
 *   stderr = human-readable summary.
 * - No destructive operations. Only INSERTs. Never UPDATE or DELETE.
 *
 * USAGE:
 *   # Preview, no writes (always do this first):
 *   npx tsx scripts/backfill-missing-payments.ts --days=180 --limit=500
 *
 *   # After reviewing the CSV in REPORTS-IGNORE/:
 *   npx tsx scripts/backfill-missing-payments.ts --days=180 --limit=500 --write
 *
 *   # Rerun until dry-run output shows would_insert=0:
 *   npx tsx scripts/backfill-missing-payments.ts --days=180 --limit=500
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local so STRIPE_SECRET_KEY, SUPABASE_URL, etc. are available when
// invoked via `npx tsx` (which doesn't auto-load Next.js env files).
function loadEnv(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
loadEnv();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MEMBERSHIP_AMOUNTS_CENTS = new Set([1500, 10000]); // $15 contributing, $100 founding

const SLEEP_BETWEEN_API_MS = 250;

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseIntArg(flag: string, fallback: number): number {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (!arg) return fallback;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const HAS_WRITE = process.argv.includes("--write");
const DRY_RUN = !HAS_WRITE;
const LIMIT = parseIntArg("--limit", 100);
const DAYS = parseIntArg("--days", 90);
const MAX_RUNTIME_S = parseIntArg("--max-runtime", 120);
const MAX_STRIPE_CALLS = parseIntArg("--max-stripe-calls", 200);

// ---------------------------------------------------------------------------
// Output file
// ---------------------------------------------------------------------------

const reportsDir = path.join(process.cwd(), "REPORTS-IGNORE");
const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .slice(0, 19); // YYYY-MM-DDTHH-MM-SS
const csvPath = path.join(reportsDir, `backfill-${timestamp}.csv`);

fs.mkdirSync(reportsDir, { recursive: true });

const CSV_HEADER =
  "invoice_id,customer_email,amount_cents,payment_type,action,reason\n";
fs.appendFileSync(csvPath, CSV_HEADER);

function csvEscape(s: string | null | undefined): string {
  if (s === null || s === undefined) return "";
  const str = String(s);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeRow(row: string): void {
  process.stdout.write(row);
  fs.appendFileSync(csvPath, row);
}

function summarize(action: string, reason: string): string {
  return reason ? `${action},${reason}` : action;
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

const banner = `[backfill] mode=${DRY_RUN ? "DRY-RUN" : "WRITE"} days=${DAYS} limit=${LIMIT} maxRuntime=${MAX_RUNTIME_S}s maxStripeCalls=${MAX_STRIPE_CALLS}`;
console.error(banner);
if (DRY_RUN) {
  console.error("[backfill] DRY-RUN: no writes will occur. Pass --write to insert.");
} else {
  console.error("[backfill] WARNING: --write set. Will INSERT into membership_payments.");
}
console.error(`[backfill] output: ${csvPath}`);
console.error("");

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const startTs = Date.now();
let stripeCalls = 0;
let invoicesScanned = 0;
let invoicesMatched = 0;
let wouldInsert = 0;
let didInsert = 0;
let skippedReasons: Record<string, number> = {};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withinBudget(): boolean {
  if ((Date.now() - startTs) / 1000 > MAX_RUNTIME_S) {
    console.error(`[backfill] STOP: max-runtime (${MAX_RUNTIME_S}s) exceeded`);
    return false;
  }
  if (stripeCalls >= MAX_STRIPE_CALLS) {
    console.error(`[backfill] STOP: max-stripe-calls (${MAX_STRIPE_CALLS}) exceeded`);
    return false;
  }
  if (didInsert >= LIMIT || (!HAS_WRITE && wouldInsert >= LIMIT)) {
    console.error(`[backfill] STOP: limit (${LIMIT}) reached`);
    return false;
  }
  return true;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function findUserByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc("find_user_by_email", {
    target_email: email,
  });
  if (error) {
    console.error(`[backfill] RPC find_user_by_email error for ${email}:`, error.message);
    return null;
  }
  if (!data || data.length === 0) return null;
  return (data[0] as { id: string }).id;
}

function recordSkip(reason: string): void {
  skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
}

// ---------------------------------------------------------------------------
// Per-invoice processing
// ---------------------------------------------------------------------------

async function processInvoice(invoice: Stripe.Invoice): Promise<void> {
  const amountCents = invoice.amount_paid || 0;

  // Check if already exists in membership_payments (idempotency check)
  const { data: existing } = await supabaseAdmin
    .from("membership_payments")
    .select("id")
    .eq("stripe_invoice_id", invoice.id)
    .maybeSingle();

  if (existing) {
    recordSkip("already_exists");
    writeRow(
      `${csvEscape(invoice.id)},${csvEscape(invoice.customer_email)},${amountCents},,${summarize("skip", "already_exists")},\n`,
    );
    return;
  }

  if (!invoice.customer_email) {
    recordSkip("no_email");
    writeRow(
      `${csvEscape(invoice.id)},,${amountCents},,${summarize("skip", "no_email")},\n`,
    );
    return;
  }

  const authUserId = await findUserByEmail(invoice.customer_email);
  if (!authUserId) {
    recordSkip("no_auth_user");
    writeRow(
      `${csvEscape(invoice.id)},${csvEscape(invoice.customer_email)},${amountCents},,${summarize("skip", "no_auth_user")},\n`,
    );
    return;
  }

  // Confirm a profile exists for this auth user
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", authUserId)
    .maybeSingle();

  if (!profile) {
    recordSkip("no_profile");
    writeRow(
      `${csvEscape(invoice.id)},${csvEscape(invoice.customer_email)},${amountCents},,${summarize("skip", "no_profile")},\n`,
    );
    return;
  }

  // Determine payment_type: "signup" if user has no other successful payments, else "renewal"
  const { count: priorSuccessful } = await supabaseAdmin
    .from("membership_payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", authUserId)
    .eq("status", "succeeded");

  const paymentType = (priorSuccessful && priorSuccessful > 0) ? "renewal" : "signup";

  // Insert (or preview)
  if (DRY_RUN) {
    wouldInsert += 1;
    writeRow(
      `${csvEscape(invoice.id)},${csvEscape(invoice.customer_email)},${amountCents},${paymentType},${summarize("would_insert", "")},\n`,
    );
  } else {
    const { error: insertError } = await supabaseAdmin
      .from("membership_payments")
      .insert({
        user_id: authUserId,
        amount: amountCents / 100,
        payment_type: paymentType,
        stripe_invoice_id: invoice.id,
        stripe_payment_id: null,
        status: "succeeded",
      });

    if (insertError) {
      // Most likely cause: 23505 unique_violation on stripe_invoice_id (race
      // with another process). Treat as "skipped" so the script can keep going.
      if (insertError.code === "23505") {
        recordSkip("conflict");
        writeRow(
          `${csvEscape(invoice.id)},${csvEscape(invoice.customer_email)},${amountCents},${paymentType},${summarize("skip", "conflict")},\n`,
        );
      } else {
        recordSkip(`insert_error:${insertError.code || "unknown"}`);
        writeRow(
          `${csvEscape(invoice.id)},${csvEscape(invoice.customer_email)},${amountCents},${paymentType},${summarize("error", insertError.message || "insert failed")},\n`,
        );
      }
    } else {
      didInsert += 1;
      writeRow(
        `${csvEscape(invoice.id)},${csvEscape(invoice.customer_email)},${amountCents},${paymentType},inserted,\n`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Main: paginate Stripe invoices
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const cutoffTs = Math.floor((Date.now() - DAYS * 24 * 60 * 60 * 1000) / 1000);
  let cursor: string | undefined;

  while (withinBudget()) {
    const params: Stripe.InvoiceListParams = {
      created: { gte: cutoffTs },
      status: "paid",
      limit: 100,
    };
    if (cursor) params.starting_after = cursor;

    stripeCalls += 1;
    const page = await stripe.invoices.list(params);

    invoicesScanned += page.data.length;

    for (const invoice of page.data) {
      if (!withinBudget()) break;
      const amountCents = invoice.amount_paid || 0;
      if (!MEMBERSHIP_AMOUNTS_CENTS.has(amountCents)) {
        // Not a membership invoice — skip without logging to CSV (no noise).
        continue;
      }
      invoicesMatched += 1;
      await processInvoice(invoice);
    }

    if (!page.has_more) break;
    cursor = page.data[page.data.length - 1].id;

    await sleep(SLEEP_BETWEEN_API_MS);
  }

  // -------------------------------------------------------------------------
  // Final summary (stderr)
  // -------------------------------------------------------------------------
  const elapsedS = ((Date.now() - startTs) / 1000).toFixed(1);
  console.error("");
  console.error(`[backfill] DONE elapsed=${elapsedS}s stripeCalls=${stripeCalls}`);
  console.error(`[backfill] invoicesScanned=${invoicesScanned} matched=${invoicesMatched}`);
  if (DRY_RUN) {
    console.error(`[backfill] wouldInsert=${wouldInsert}`);
  } else {
    console.error(`[backfill] inserted=${didInsert} skipped_conflict=${skippedReasons.conflict || 0}`);
  }
  if (Object.keys(skippedReasons).length > 0) {
    console.error(
      "[backfill] skipped: " +
        Object.entries(skippedReasons)
          .map(([k, v]) => `${k}=${v}`)
          .join(" "),
    );
  }
  console.error(`[backfill] csv: ${csvPath}`);
}

main().catch((err) => {
  console.error("[backfill] FATAL", err);
  process.exit(1);
});