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

interface FixCustomerRequest {
  members: {
    profile_id: string;
    email: string;
  }[];
}

interface FixResult {
  profile_id: string;
  email: string;
  success: boolean;
  old_customer_id: string | null;
  new_customer_id: string | null;
  error?: string;
}

async function findActiveStripeCustomer(email: string): Promise<string | null> {
  try {
    // Search for customers by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10,
    });

    // Find the first customer with an active subscription
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        return customer.id;
      }
    }

    // No active subscription found - return the first customer if any
    if (customers.data.length > 0) {
      return customers.data[0].id;
    }

    return null;
  } catch (error) {
    console.error(`[fix-customer-ids] Error finding Stripe customer for ${email}:`, error);
    return null;
  }
}

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

    const body: FixCustomerRequest = await request.json();

    if (!body.members || !Array.isArray(body.members) || body.members.length === 0) {
      return NextResponse.json(
        { error: "members array is required" },
        { status: 400 }
      );
    }

    const results: FixResult[] = [];

    for (const member of body.members) {
      const result: FixResult = {
        profile_id: member.profile_id,
        email: member.email,
        success: false,
        old_customer_id: null,
        new_customer_id: null,
      };

      try {
        // Get current stripe_customer_id from profiles
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("stripe_customer_id, email")
          .eq("id", member.profile_id)
          .single();

        result.old_customer_id = profile?.stripe_customer_id || null;

        // Find the correct Stripe customer
        const newCustomerId = await findActiveStripeCustomer(member.email);

        if (!newCustomerId) {
          result.error = "No Stripe customer found with active subscription";
          results.push(result);
          continue;
        }

        result.new_customer_id = newCustomerId;

        // Update profiles.stripe_customer_id
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: newCustomerId })
          .eq("id", member.profile_id);

        if (profileError) {
          result.error = `Failed to update profiles: ${profileError.message}`;
          results.push(result);
          continue;
        }

        // Update stripe_backfill_status.stripe_customer_id
        const { error: backfillError } = await supabaseAdmin
          .from("stripe_backfill_status")
          .update({ stripe_customer_id: newCustomerId })
          .eq("profile_id", member.profile_id);

        if (backfillError) {
          // If no backfill row exists, try to find by email
          const { data: backfillByEmail } = await supabaseAdmin
            .from("stripe_backfill_status")
            .select("id")
            .eq("email", member.email)
            .single();

          if (backfillByEmail) {
            await supabaseAdmin
              .from("stripe_backfill_status")
              .update({ stripe_customer_id: newCustomerId })
              .eq("id", backfillByEmail.id);
          } else {
            console.warn(`[fix-customer-ids] No stripe_backfill_status row for ${member.email}`);
          }
        }

        result.success = true;
      } catch (err) {
        result.error = err instanceof Error ? err.message : "Unknown error";
      }

      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Fixed ${successCount} customer IDs, ${failureCount} failures`,
      results,
    });

  } catch (error) {
    console.error("[fix-customer-ids] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fix customer IDs" },
      { status: 500 }
    );
  }
}
