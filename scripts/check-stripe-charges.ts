import Stripe from "stripe";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  }
}

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

async function main() {
  console.log("Step 1: Fetching contributing/founding profiles with no gift codes...\n");

  // Get contributing/founding profiles that are NOT gift code
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      membership_level,
      stripe_customer_id,
      first_paid_at,
      gift_code_redeemed,
      joined_at
    `)
    .in("membership_level", ["contributing", "founding"])
    .eq("gift_code_redeemed", false)
    .eq("profile_completed", true)
    .neq("is_admin", true);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return;
  }

  console.log(`Found ${profiles?.length || 0} contributing/founding profiles without gift codes\n`);

  // Get profiles that HAVE payment records
  const { data: payments, error: paymentsError } = await supabaseAdmin
    .from("membership_payments")
    .select("user_id");

  if (paymentsError) {
    console.error("Error fetching payments:", paymentsError);
    return;
  }

  console.log(`Found ${payments?.length || 0} total payment records\n`);

  const paidUserIds = new Set((payments || []).map(p => p.user_id));
  console.log(`Unique users with payments: ${paidUserIds.size}\n`);

  // Filter to profiles WITHOUT payments
  const profilesWithoutPayments = (profiles || []).filter(p => !paidUserIds.has(p.id));

  console.log(`Profiles WITHOUT payment records: ${profilesWithoutPayments.length}\n`);

  if (profilesWithoutPayments.length === 0) {
    console.log("No profiles to check - all done!");
    return;
  }

  // Check each profile against Stripe
  const results: Array<{
    email: string;
    stripe_customer_id: string | null;
    membership_level: string;
    first_paid_at: string | null;
    stripe_has_charges: boolean;
    charges_count: number;
    total_charged: number;
    charge_statuses: string[];
    error?: string;
  }> = [];

  for (const profile of profilesWithoutPayments) {
    try {
      process.stdout.write(`Checking ${profile.email} (${profile.stripe_customer_id || "no stripe id"})... `);

      if (!profile.stripe_customer_id) {
        results.push({
          email: profile.email,
          stripe_customer_id: null,
          membership_level: profile.membership_level,
          first_paid_at: profile.first_paid_at,
          stripe_has_charges: false,
          charges_count: 0,
          total_charged: 0,
          charge_statuses: [],
          error: "No stripe_customer_id on profile",
        });
        console.log("NO STRIPE ID\n");
        continue;
      }

      // Check for charges
      const charges = await stripe.charges.list({
        customer: profile.stripe_customer_id,
        limit: 10,
      });

      const chargeStatuses = charges.data.map(c => c.status);
      const totalCharged = charges.data.reduce((sum, c) => sum + (c.amount / 100), 0);

      results.push({
        email: profile.email,
        stripe_customer_id: profile.stripe_customer_id,
        membership_level: profile.membership_level,
        first_paid_at: profile.first_paid_at,
        stripe_has_charges: charges.data.length > 0,
        charges_count: charges.data.length,
        total_charged: totalCharged,
        charge_statuses: chargeStatuses,
      });

      console.log(`${charges.data.length > 0 ? "HAS CHARGES" : "NO CHARGES"} (${charges.data.length} charges, $${totalCharged.toFixed(2)})\n`);

      // Rate limit
      await new Promise(r => setTimeout(r, 100));

    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : "Unknown error"}\n`);
      results.push({
        email: profile.email,
        stripe_customer_id: profile.stripe_customer_id,
        membership_level: profile.membership_level,
        first_paid_at: profile.first_paid_at,
        stripe_has_charges: false,
        charges_count: 0,
        total_charged: 0,
        charge_statuses: [],
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("RESULTS SUMMARY");
  console.log("=".repeat(80));

  const withCharges = results.filter(r => r.stripe_has_charges);
  const withoutCharges = results.filter(r => !r.stripe_has_charges);
  const withErrors = results.filter(r => r.error);

  console.log(`\nTotal profiles checked: ${results.length}`);
  console.log(`Profiles WITH Stripe charges: ${withCharges.length}`);
  console.log(`Profiles WITHOUT Stripe charges: ${withoutCharges.length}`);
  console.log(`Errors: ${withErrors.length}`);

  console.log("\n" + "-".repeat(80));
  console.log(`PROFILES WITH CHARGES (${withCharges.length}):`);
  console.log("-".repeat(80));
  
  let totalFromCharges = 0;
  for (const r of withCharges) {
    totalFromCharges += r.total_charged;
    console.log(`\n✓ ${r.email}`);
    console.log(`  Membership: ${r.membership_level}`);
    console.log(`  Stripe ID: ${r.stripe_customer_id}`);
    console.log(`  first_paid_at: ${r.first_paid_at}`);
    console.log(`  Charges: ${r.charges_count}, Total: $${r.total_charged.toFixed(2)}`);
    console.log(`  Statuses: ${r.charge_statuses.join(", ")}`);
  }
  console.log(`\nTOTAL FROM STRIPE CHARGES: $${totalFromCharges.toFixed(2)}`);

  console.log("\n" + "-".repeat(80));
  console.log(`PROFILES WITHOUT CHARGES (${withoutCharges.length}):`);
  console.log("-".repeat(80));
  
  for (const r of withoutCharges) {
    console.log(`\n✗ ${r.email}`);
    console.log(`  Membership: ${r.membership_level}`);
    console.log(`  Stripe ID: ${r.stripe_customer_id}`);
    console.log(`  first_paid_at: ${r.first_paid_at}`);
    if (r.error) console.log(`  Error: ${r.error}`);
  }

  if (withErrors.length > 0) {
    console.log("\n" + "-".repeat(80));
    console.log("ERRORS:");
    console.log("-".repeat(80));
    for (const r of withErrors) {
      console.log(`\n! ${r.email}: ${r.error}`);
    }
  }

  // Output CSV
  console.log("\n" + "=".repeat(80));
  console.log("CSV OUTPUT:");
  console.log("=".repeat(80));
  console.log("email,membership_level,stripe_customer_id,first_paid_at,has_charges,charges_count,total_charged,charge_statuses,error");
  
  for (const r of results) {
    console.log([
      r.email,
      r.membership_level,
      r.stripe_customer_id || "",
      r.first_paid_at || "",
      r.stripe_has_charges ? "YES" : "NO",
      r.charges_count,
      r.total_charged.toFixed(2),
      r.charge_statuses.join("; ") || "",
      r.error || "",
    ].join(","));
  }
}

main().catch(console.error);
