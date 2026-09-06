import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = rateLimit(`membership-upgrade:${ip}`, 5, 60_000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a contributing member and get stripe_customer_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, membership_level, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.membership_level !== "contributing") {
      return NextResponse.json(
        { error: "Only contributing members can upgrade to founding" },
        { status: 400 },
      );
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found. Please contact support." },
        { status: 400 },
      );
    }

    // Find the active subscription for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: "No active subscription found. Please contact support." },
        { status: 400 },
      );
    }

    const subscription = subscriptions.data[0];

    // Create an invoice item for the $85 upgrade difference
    // This will be charged immediately when we finalize the invoice
    const invoiceItem = await stripe.invoiceItems.create({
      customer: profile.stripe_customer_id,
      amount: 8500, // $85 in cents
      currency: "usd",
      description: "Contributing to Founding membership upgrade",
      metadata: {
        user_id: profile.id,
        upgrade_type: "contributing_to_founding",
        subscription_id: subscription.id,
      },
    });

    // Create and finalize the invoice (this triggers immediate charge)
    const invoice = await stripe.invoices.create({
      customer: profile.stripe_customer_id,
      auto_advance: true,
      collection_method: "charge_automatically",
      metadata: {
        user_id: profile.id,
        upgrade_type: "contributing_to_founding",
        invoice_item_id: invoiceItem.id,
      },
    });

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // Check if the invoice was paid immediately
    if (finalizedInvoice.status === "paid") {
      // Invoice was paid immediately - we can proceed
      return NextResponse.json({
        success: true,
        invoiceId: finalizedInvoice.id,
        amountCharged: 85,
        status: "paid",
        message: "Upgrade successful! You've been charged $85.",
      });
    } else if (finalizedInvoice.status === "open") {
      // Invoice is open but not paid yet - it will be retried
      return NextResponse.json({
        success: true,
        invoiceId: finalizedInvoice.id,
        amountCharged: 85,
        status: "pending",
        message: "Upgrade initiated. You will be charged $85 shortly.",
      });
    } else {
      // Invoice failed or other status
      return NextResponse.json(
        { error: "Payment failed. Please try again or contact support." },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Membership upgrade error:", error);
    
    // Clean up: delete the invoice item if invoice creation failed
    if (error.code === "invoice_no_customer") {
      return NextResponse.json(
        { error: "Customer not found in Stripe. Please contact support." },
        { status: 400 },
      );
    }
    
    return NextResponse.json(
      { error: "Failed to process upgrade. Please try again." },
      { status: 500 },
    );
  }
}