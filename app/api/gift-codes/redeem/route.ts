import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Gift code is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to redeem a gift code" },
        { status: 401 },
      );
    }

    const supabaseAdmin = (await import("@supabase/supabase-js")).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Find the gift code
    const { data: giftCode, error: codeError } = await supabaseAdmin
      .from("gift_membership_codes")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (codeError || !giftCode) {
      return NextResponse.json(
        { error: "Invalid gift code" },
        { status: 400 },
      );
    }

    // Check if already redeemed
    if (giftCode.redeemed_at) {
      return NextResponse.json(
        { error: "This gift code has already been used" },
        { status: 400 },
      );
    }

    // Redeem the code: update user profile to contributing
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    // Get user's current profile for name and membership level
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, membership_level, first_paid_at, first_paid_level")
      .eq("id", user.id)
      .single();

    // Update the user's profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        membership_level: "contributing",
        previous_membership_level: profile?.membership_level || 'free',
        subscription_status: "active",
        subscription_ends_at: oneYearFromNow.toISOString(),
        updated_at: new Date().toISOString(),
        // Track first paid upgrade (only if not already set)
        first_paid_at: profile?.first_paid_at || new Date().toISOString(),
        first_paid_level: profile?.first_paid_level || "contributing",
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Failed to update profile:", profileError);
      return NextResponse.json(
        { error: "Failed to apply gift code" },
        { status: 500 },
      );
    }

    // Send welcome email
    const { sendWelcomeEmail } = await import("@/lib/email");
    await sendWelcomeEmail({
      to: user.email!,
      name: profile?.full_name || "there",
      membershipType: "contributing",
      memberId: user.id,
      renewalDate: oneYearFromNow.toISOString(),
    }).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    // Sync to Access Perks (idempotent - only syncs if access_perks_member_id is null)
    try {
      const { checkAndSyncAccessMember } = await import("@/lib/access-perks/member-sync");
      await checkAndSyncAccessMember(supabaseAdmin, user.id, user.email!);
    } catch (err) {
      console.error("Failed to sync to Access Perks:", err);
    }

    // Mark the code as redeemed
    const { error: redeemError } = await supabaseAdmin
      .from("gift_membership_codes")
      .update({
        redeemed_at: new Date().toISOString(),
        redeemed_by_user_id: user.id,
        redeemed_by_email: user.email,
      })
      .eq("id", giftCode.id);

    if (redeemError) {
      console.error("Failed to mark code as redeemed:", redeemError);
    }

    return NextResponse.json({
      success: true,
      message: "Gift code redeemed! You now have 1 year of Contributing membership.",
      subscriptionEndsAt: oneYearFromNow.toISOString(),
    });
  } catch (error) {
    console.error("Gift code redemption error:", error);
    return NextResponse.json(
      { error: "Failed to redeem gift code" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Gift code is required" },
        { status: 400 },
      );
    }

    const supabaseAdmin = (await import("@supabase/supabase-js")).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Find the gift code
    const { data: giftCode, error: codeError } = await supabaseAdmin
      .from("gift_membership_codes")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (codeError || !giftCode) {
      return NextResponse.json(
        { valid: false, error: "Invalid gift code" },
        { status: 200 },
      );
    }

    // Check if already redeemed
    if (giftCode.redeemed_at) {
      return NextResponse.json({
        valid: false,
        error: "This gift code has already been used",
        redeemed: true,
      });
    }

    return NextResponse.json({
      valid: true,
      message: "This gift code is valid!",
    });
  } catch (error) {
    console.error("Gift code validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate gift code" },
      { status: 500 },
    );
  }
}