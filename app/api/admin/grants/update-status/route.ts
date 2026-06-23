import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const VALID_STATUSES = [
  "submitted",
  "in_review",
  "approved",
  "not_approved",
  "payment_pending",
  "payment_sent",
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { grantId, status, amount_approved, admin_notes } =
      await request.json();

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { status };
    if (amount_approved !== undefined)
      updates.amount_approved = amount_approved;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (status === "approved") {
      updates.reviewed_at = new Date().toISOString();
      updates.reviewed_by = user.id;
    }
    if (status === "payment_sent") updates.funded_at = new Date().toISOString();

    // TEMPORARILY DISABLED: Auto-transfer for approved grants
    // Re-enable by uncommenting this block and implementing toggle setting
    //
    // if (status === "approved" && amount_approved) {
    //   const { data: grant } = await supabaseAdmin
    //     .from("grants")
    //     .select("stripe_connect_account_id, user_id, amount_approved, grant_cycles(cycle_name)")
    //     .eq("id", grantId)
    //     .single();
    //
    //   if (grant?.stripe_connect_account_id) {
    //     try {
    //       const account = await stripe.accounts.retrieve(grant.stripe_connect_account_id);
    //
    //       if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
    //         // Account fully ready - create transfer
    //         const transfer = await stripe.transfers.create({
    //           amount: Math.round(amount_approved * 100), // Convert to cents
    //           currency: "usd",
    //           destination: grant.stripe_connect_account_id,
    //           metadata: {
    //             grantId: grantId,
    //             userId: grant.user_id,
    //           },
    //         });
    //
    //         console.log(`[AutoTransfer] Created transfer ${transfer.id} for grant ${grantId}, amount $${amount_approved}`);
    //
    //         // Update to payment_sent immediately
    //         updates.status = "payment_sent";
    //         updates.funded_at = new Date().toISOString();
    //
    //         // Send admin and user notification emails
    //         const { data: profile } = await supabaseAdmin
    //           .from("profiles")
    //           .select("full_name")
    //           .eq("id", grant.user_id)
    //           .single();
    //
    //         const { data: authUser } = await supabaseAdmin
    //           .from("auth.users")
    //           .select("email")
    //           .eq("id", grant.user_id)
    //           .single();
    //
    //         const cycleName = (grant.grant_cycles as any)?.cycle_name || "Grant";
    //         const amountStr = amount_approved.toLocaleString();
    //
    //         // Send admin notification
    //         sendPaymentSentAdminEmail({
    //           memberName: profile?.full_name || "Unknown",
    //           memberEmail: authUser?.email || "Unknown",
    //           grantCycleName: cycleName,
    //           grantId: grantId,
    //           amount: amountStr,
    //         }).catch(err => console.error("[AutoTransfer] Failed to send admin email:", err));
    //
    //         // Send user notification
    //         sendPaymentSentUserEmail({
    //           memberName: profile?.full_name || "Unknown",
    //           memberEmail: authUser?.email || "Unknown",
    //           grantCycleName: cycleName,
    //           amount: amountStr,
    //         }).catch(err => console.error("[AutoTransfer] Failed to send user email:", err));
    //       } else {
    //         console.log(`[AutoTransfer] Stripe account not fully onboarded for grant ${grantId}, will handle via webhook`);
    //       }
    //     } catch (err) {
    //       console.error(`[AutoTransfer] Error checking Stripe account for grant ${grantId}:`, err);
    //       // Continue with normal approval if transfer fails
    //     }
    //   }
    // }

    const { error } = await supabaseAdmin
      .from("grants")
      .update(updates)
      .eq("id", grantId);

    if (error)
      return NextResponse.json(
        { error: "Failed to update grant status" },
        { status: 500 },
      );

    // Send status update email
    const { data: grantData } = await supabaseAdmin
      .from("grants")
      .select("user_id, grant_cycles(cycle_name)")
      .eq("id", grantId)
      .single();

    if (grantData) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", grantData.user_id)
        .single();

      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(grantData.user_id);
      const userEmail = userData?.user?.email;

      if (userEmail) {
        const { sendGrantStatusEmail } = await import("@/lib/email");
        await sendGrantStatusEmail({
          to: userEmail,
          name: profile?.full_name || "Member",
          status,
          grantCycleName:
            (grantData.grant_cycles as any)?.cycle_name || "NFW Microgrant",
          amountApproved: amount_approved,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 },
    );
  }
}
