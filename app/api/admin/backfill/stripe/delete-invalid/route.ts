import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  void request; // Required by Next.js but not used
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

    // Find all payments where amount is NOT $15 or $100
    const { data: invalidPayments, error: selectError } = await supabaseAdmin
      .from("membership_payments")
      .select("id, amount, stripe_payment_id, created_at")
      .not("amount", "in", "(15, 100)");

    if (selectError) {
      console.error("[delete-invalid] Select error:", selectError);
      return NextResponse.json(
        { error: selectError.message || "Failed to find invalid payments" },
        { status: 500 }
      );
    }

    if (!invalidPayments || invalidPayments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No invalid payments found",
        deleted: 0,
        total_removed: 0,
      });
    }

    const totalRemoved = invalidPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Delete invalid payments
    const { error: deleteError } = await supabaseAdmin
      .from("membership_payments")
      .delete()
      .not("amount", "in", "(15, 100)");

    if (deleteError) {
      console.error("[delete-invalid] Delete error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete invalid payments" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${invalidPayments.length} invalid payment(s)`,
      deleted: invalidPayments.length,
      total_removed: totalRemoved,
      payments: invalidPayments,
    });

  } catch (error) {
    console.error("[delete-invalid] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete invalid payments" },
      { status: 500 }
    );
  }
}