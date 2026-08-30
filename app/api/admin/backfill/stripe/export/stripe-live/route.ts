import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const tier = searchParams.get("tier") || "contributing"; // contributing or founding

    // Get all active subscriptions
    let hasMore = true;
    let cursor;
    const allSubscriptions: Stripe.Subscription[] = [];

    while (hasMore) {
      const params: { limit: number; starting_after?: string; status: "active" | "past_due" | "canceled" | "unpaid" | "trialing" | "incomplete" | "incomplete_expired" | "paused" } = {
        limit: 100,
        status: "active",
      };
      if (cursor) params.starting_after = cursor;

      const response = await stripe.subscriptions.list(params as any);

      for (const sub of response.data) {
        const priceAmount = sub.items.data[0]?.price?.unit_amount;
        if (tier === "contributing" && priceAmount === 1500) {
          allSubscriptions.push(sub);
        } else if (tier === "founding" && priceAmount === 10000) {
          allSubscriptions.push(sub);
        }
      }

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        cursor = response.data[response.data.length - 1].id;
      }
      await new Promise(r => setTimeout(r, 25));
    }

    // Build CSV data
    const csvRows: string[] = [];
    csvRows.push("Email,Subscription ID,Customer ID,Amount,Status,Current Period Start,Current Period End");

    for (const sub of allSubscriptions) {
      const subAny = sub as any;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      const email = subAny.email || "";
      const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;
      const currentPeriodStart = new Date(subAny.current_period_start * 1000).toISOString();
      const currentPeriodEnd = new Date(subAny.current_period_end * 1000).toISOString();

      csvRows.push(`"${email}","${sub.id}","${customerId}","${amount}","${sub.status}","${currentPeriodStart}","${currentPeriodEnd}"`);
    }

    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="stripe-live-${tier}.csv"`,
      },
    });

  } catch (error: any) {
    console.error("[export-stripe-live] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export" },
      { status: 500 }
    );
  }
}