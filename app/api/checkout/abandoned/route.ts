import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ hasAbandoned: false }, { status: 401 });
    }

    // Suppress banner for paid members. Orphaned abandoned_checkouts rows can exist
    // for paid members due to webhook race conditions (e.g., checkout.session.expired
    // firing after checkout.session.completed, or session_id drift on resume). Paid
    // members shouldn't see "incomplete purchase" banners.
    const { data: profile } = await supabase
      .from("profiles")
      .select("membership_level")
      .eq("id", user.id)
      .single();

    const isPaidMember =
      profile?.membership_level === "contributing" || profile?.membership_level === "founding";

    if (isPaidMember) {
      return NextResponse.json({ hasAbandoned: false });
    }

    // Find user's active abandoned checkout (not yet recovered)
    const { data: abandoned } = await supabase
      .from("abandoned_checkouts")
      .select("id, membership_level, checkout_url, created_at")
      .eq("user_id", user.id)
      .is("recovered_at", null)
      .single();

    if (!abandoned) {
      return NextResponse.json({ hasAbandoned: false });
    }

    return NextResponse.json({
      hasAbandoned: true,
      membershipLevel: abandoned.membership_level,
      checkoutUrl: abandoned.checkout_url,
      createdAt: abandoned.created_at,
    });
  } catch (error) {
    console.error("[api/checkout/abandoned] Error:", error);
    return NextResponse.json({ hasAbandoned: false }, { status: 500 });
  }
}
