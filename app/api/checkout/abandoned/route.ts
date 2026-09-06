import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ hasAbandoned: false }, { status: 401 });
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
