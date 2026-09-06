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

export async function POST(request: Request) {
  try {
    // Admin auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { profile_id, stripe_customer_id, email } = await request.json();

    if (!profile_id) {
      return NextResponse.json({ error: "profile_id is required" }, { status: 400 });
    }

    let customerId: string | null = stripe_customer_id;
    let foundInStripe = false;
    let customerEmail = email || "";
    let customerName = "";

    // Try to find the customer in Stripe
    if (customerId) {
      // First try with the provided stripe_customer_id
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (!customer.deleted && customer.email) {
          foundInStripe = true;
          customerEmail = customer.email;
          customerName = customer.name || "";
        }
      } catch {
        // Customer ID didn't work, try email lookup
        customerId = null;
      }
    }

    // If not found by customer ID, try email lookup
    if (!foundInStripe && customerEmail) {
      try {
        const customers = await stripe.customers.list({
          email: customerEmail,
          limit: 1,
        });
        if (customers.data.length > 0) {
          foundInStripe = true;
          customerId = customers.data[0].id;
          customerEmail = customers.data[0].email || customerEmail;
          customerName = customers.data[0].name || "";
        }
      } catch {
        // Email lookup failed
      }
    }

    if (!foundInStripe || !customerId) {
      return NextResponse.json({
        success: false,
        found: false,
        message: "Customer not found in Stripe",
      });
    }

    // Update or insert into stripe_backfill_status with matched status
    const { error: upsertError } = await supabaseAdmin
      .from("stripe_backfill_status")
      .upsert({
        profile_id,
        email: customerEmail,
        stripe_customer_id: customerId,
        status: "matched",
        processed_at: new Date().toISOString(),
      }, {
        onConflict: "profile_id",
      });

    if (upsertError) {
      console.error("[rematch] Error upserting:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      found: true,
      customer_id: customerId,
      email: customerEmail,
      name: customerName,
      message: `Successfully matched ${customerEmail}`,
    });

  } catch (error) {
    console.error("[rematch] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to re-match" },
      { status: 500 }
    );
  }
}
