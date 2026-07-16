import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: grantId } = await params;

    // Get grant with profile and cycle info
    const { data: grant, error: grantError } = await supabaseAdmin
      .from("grants")
      .select(`
        id,
        user_id,
        status,
        amount_approved,
        stripe_connect_account_id,
        cycle_id,
        profiles:user_id (full_name),
        grant_cycles (cycle_name, total_funds)
      `)
      .eq("id", grantId)
      .single();

    if (grantError || !grant) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }

    // Verify grant is approved
    if (grant.status !== "approved") {
      return NextResponse.json(
        { error: `Grant status must be 'approved', currently '${grant.status}'` },
        { status: 400 }
      );
    }

    // Verify stripe_connect_account_id exists
    if (!grant.stripe_connect_account_id) {
      return NextResponse.json(
        { error: "No Stripe Connect account found for this grant" },
        { status: 400 }
      );
    }

    // Verify amount_approved
    if (!grant.amount_approved || grant.amount_approved <= 0) {
      return NextResponse.json(
        { error: "Invalid grant amount" },
        { status: 400 }
      );
    }

    // Check total_funds limit
    const totalFunds = (grant.grant_cycles as any)?.total_funds;
    if (totalFunds) {
      // Calculate total already paid for this cycle
      const { data: paidGrants } = await supabaseAdmin
        .from("grants")
        .select("amount_approved")
        .eq("cycle_id", grant.cycle_id)
        .not("funded_at", "is", null);

      const totalPaid = (paidGrants || []).reduce(
        (sum: number, g: any) => sum + Number(g.amount_approved || 0),
        0
      );

      if (Number(grant.amount_approved) + totalPaid > totalFunds) {
        return NextResponse.json(
          {
            error: `Transfer would exceed cycle total funds of $${totalFunds.toLocaleString()}. Total paid: $${totalPaid.toLocaleString()}, Remaining: $${(totalFunds - totalPaid).toLocaleString()}`,
          },
          { status: 400 }
        );
      }
    }

    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(grant.amount_approved * 100), // Convert to cents
      currency: "usd",
      destination: grant.stripe_connect_account_id,
      metadata: {
        grantId: grant.id,
        userId: grant.user_id,
      },
    });

    console.log(`[transfer] Created transfer ${transfer.id} for grant ${grant.id}`);

    // Update grant with transfer info
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("grants")
      .update({
        status: "payment_sent",
        funded_at: now,
        transfer_id: transfer.id,
      })
      .eq("id", grantId);

    console.log(`[transfer] Updated grant ${grant.id} to payment_sent`);

    // Send user confirmation email
    const profile = Array.isArray(grant.profiles) ? grant.profiles[0] : grant.profiles;
    const cycleName = (grant.grant_cycles as any)?.cycle_name || "Grant";
    const amountStr = grant.amount_approved.toLocaleString();

    // Get user's email from auth.users
    const { data: authUser } = await supabaseAdmin
      .from("auth.users")
      .select("email")
      .eq("id", grant.user_id)
      .single();

    try {
      const { sendPaymentSentUserEmail } = await import("@/lib/email");
      await sendPaymentSentUserEmail({
        memberName: profile?.full_name || "there",
        memberEmail: authUser?.email || "",
        grantCycleName: cycleName,
        amount: amountStr,
      });
      console.log(`[transfer] Sent payment confirmation email for grant ${grant.id}`);
    } catch (emailError) {
      // Log but don't fail - transfer already happened
      console.error(`[transfer] Failed to send email for grant ${grant.id}:`, emailError);
    }

    return NextResponse.json({
      success: true,
      transfer_id: transfer.id,
      funded_at: now,
      amount: grant.amount_approved,
    });
  } catch (err: any) {
    console.error("[transfer] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create transfer" },
      { status: 500 }
    );
  }
}
