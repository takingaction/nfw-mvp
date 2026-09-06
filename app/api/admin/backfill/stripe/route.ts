import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

// Build email → stripe_customer_id map and store in memory for process route
let cachedEmailMap: Map<string, string> | null = null;

export async function getEmailMap() {
  if (cachedEmailMap) return cachedEmailMap;

  console.log("[backfill] Fetching Stripe customers...");
  const emailToStripeId = new Map<string, string>();
  let cursor: string | undefined;

  do {
    const params: { limit: number; starting_after?: string } = { limit: 100 };
    if (cursor) params.starting_after = cursor;

    const customers = await stripe.customers.list(params);
    for (const customer of customers.data) {
      if (customer.email) {
        emailToStripeId.set(customer.email.toLowerCase(), customer.id);
      }
    }

    cursor = customers.data.length === 100 ? customers.data[customers.data.length - 1].id : undefined;
    await new Promise(r => setTimeout(r, 10));
  } while (cursor);

  console.log(`[backfill] Built map of ${emailToStripeId.size} Stripe customers`);
  cachedEmailMap = emailToStripeId;
  return emailToStripeId;
}

export async function clearEmailMap() {
  cachedEmailMap = null;
}

export async function POST(request: Request) {
  try {
    // Admin auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Clear any existing cache to ensure fresh data
    await clearEmailMap();

    // Build the email map
    await getEmailMap();

    // Clear existing backfill status
    await supabaseAdmin.from("stripe_backfill_status").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Get profiles that need stripe_customer_id
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("signup_source", "stripe")
      .is("stripe_customer_id", null)
      .in("membership_level", ["contributing", "founding"]);

    console.log(`[backfill] Found ${profiles?.length || 0} profiles to backfill`);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No profiles need backfilling",
        total: 0,
      });
    }

    // Insert all profiles into backfill status table with 'pending'
    const inserts = profiles.map(p => ({
      profile_id: p.id,
      email: p.email,
      status: "pending" as const,
    }));

    const { error } = await supabaseAdmin
      .from("stripe_backfill_status")
      .insert(inserts);

    if (error) {
      console.error("[backfill] Error inserting profiles:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[backfill] Initialized ${inserts.length} profiles for backfill`);

    return NextResponse.json({
      success: true,
      message: `Initialized ${inserts.length} profiles for backfill`,
      total: inserts.length,
    });

  } catch (error: any) {
    console.error("[backfill] Error:", error);
    return NextResponse.json(
      { error: error.message || "Backfill initialization failed" },
      { status: 500 }
    );
  }
}
