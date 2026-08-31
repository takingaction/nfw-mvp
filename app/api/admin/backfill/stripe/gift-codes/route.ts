import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Admin auth check
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get profiles where signup_source = 'gift' or gift_code_redeemed = true
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        membership_level,
        gift_code_redeemed,
        stripe_customer_id,
        gift_membership_codes(
          code
        )
      `)
      .or("signup_source.eq.gift,gift_code_redeemed.eq.true")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[gift-codes] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to include redemption info
    const transformed = (profiles || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      membership_level: p.membership_level,
      gift_code_redeemed: p.gift_code_redeemed,
      stripe_customer_id: p.stripe_customer_id,
      redemption: p.gift_membership_codes?.[0] || null,
    }));

    return NextResponse.json({ profiles: transformed });

  } catch (error: any) {
    console.error("[gift-codes] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch gift codes" },
      { status: 500 }
    );
  }
}
